use super::{PersistedUiState, UserPreferences};
use crate::persistence::{Database, PersistenceResult};
use rusqlite::params;
use serde::{de::DeserializeOwned, Serialize};

const UI_STATE: &str = "ui_state";
const PREFERENCE: &str = "preference";

/// 设置按字段逐行存储（namespace + key）。新增字段无需迁移，缺失或损坏的字段回退到默认值。
#[derive(Debug, Clone)]
pub struct SettingsRepository {
    database: Database,
}

impl SettingsRepository {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub fn load_ui_state(&self) -> PersistenceResult<PersistedUiState> {
        self.load(UI_STATE)
    }

    pub fn save_ui_state(&self, state: &PersistedUiState) -> PersistenceResult<()> {
        self.save(UI_STATE, state)
    }

    pub fn load_preferences(&self) -> PersistenceResult<UserPreferences> {
        self.load(PREFERENCE)
    }

    pub fn save_preferences(&self, preferences: &UserPreferences) -> PersistenceResult<()> {
        self.save(PREFERENCE, preferences)
    }

    fn load<T: Serialize + DeserializeOwned + Default>(&self, namespace: &str) -> PersistenceResult<T> {
        let connection = self.database.open_connection()?;
        let mut statement =
            connection.prepare("SELECT key, value_json FROM app_settings WHERE namespace = ?1")?;
        let rows = statement.query_map([namespace], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;

        let mut object = match serde_json::to_value(T::default())? {
            serde_json::Value::Object(object) => object,
            _ => return Ok(T::default()),
        };
        for row in rows {
            let (key, json) = row?;
            if !object.contains_key(&key) {
                continue;
            }
            if let Ok(value) = serde_json::from_str(&json) {
                object.insert(key, value);
            }
        }
        // 单个字段类型不对时整体回退默认值，而不是让启动失败
        Ok(serde_json::from_value(serde_json::Value::Object(object)).unwrap_or_default())
    }

    fn save<T: Serialize>(&self, namespace: &str, value: &T) -> PersistenceResult<()> {
        let serde_json::Value::Object(object) = serde_json::to_value(value)? else {
            return Ok(());
        };
        let mut connection = self.database.open_connection()?;
        let transaction = connection.transaction()?;
        for (key, value) in object {
            transaction.execute(
                "INSERT INTO app_settings (namespace, key, value_json, updated_at)
                 VALUES (?1, ?2, ?3, unixepoch())
                 ON CONFLICT (namespace, key)
                 DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
                params![namespace, key, value.to_string()],
            )?;
        }
        transaction.commit()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::SettingsRepository;
    use crate::filters::FilterCriteria;
    use crate::persistence::Database;
    use crate::settings::{PersistedUiState, UserPreferences, ViewMode};

    #[test]
    fn round_trips_and_falls_back_to_defaults() {
        let path = std::env::temp_dir().join(format!(
            "fontscape-settings-test-{}-{}.db",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let repository = SettingsRepository::new(Database::initialize(path.clone()).unwrap());

        assert_eq!(repository.load_ui_state().unwrap(), PersistedUiState::default());

        let state = PersistedUiState {
            active_filter_id: Some("preset-language-chinese".into()),
            active_filter_criteria: FilterCriteria {
                languages: vec!["Chinese".into()],
                ..Default::default()
            },
            sidebar_collapsed: true,
            view_mode: ViewMode::List,
        };
        repository.save_ui_state(&state).unwrap();
        assert_eq!(repository.load_ui_state().unwrap(), state);

        let preferences = UserPreferences {
            preview_size: 40,
            ..UserPreferences::default()
        };
        repository.save_preferences(&preferences).unwrap();
        assert_eq!(repository.load_preferences().unwrap(), preferences);

        let _ = std::fs::remove_file(path);
    }
}
