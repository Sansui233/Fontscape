use super::{PersistenceError, PersistenceResult};
use rusqlite::{params, Connection};

pub const LATEST_SCHEMA_VERSION: i64 = 2;

pub fn migrate(connection: &mut Connection) -> PersistenceResult<()> {
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version    INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        );",
    )?;

    let current_version: i64 = connection.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |row| row.get(0),
    )?;

    if current_version > LATEST_SCHEMA_VERSION {
        return Err(PersistenceError::UnsupportedSchemaVersion {
            current: current_version,
            supported: LATEST_SCHEMA_VERSION,
        });
    }

    if current_version < 1 {
        apply_v1(connection)?;
    }
    if current_version < 2 {
        apply_v2(connection)?;
    }

    Ok(())
}

fn apply_v1(connection: &mut Connection) -> PersistenceResult<()> {
    let transaction = connection.transaction()?;

    transaction.execute_batch(
        "CREATE TABLE saved_filters (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            name_key      TEXT NOT NULL UNIQUE,
            group_name    TEXT NOT NULL CHECK (group_name IN ('language', 'saved')),
            criteria_json TEXT NOT NULL,
            sort_order    INTEGER NOT NULL DEFAULT 0,
            created_at    INTEGER NOT NULL,
            updated_at    INTEGER NOT NULL
        );

        CREATE TABLE app_settings (
            namespace  TEXT NOT NULL CHECK (namespace IN ('ui_state', 'preference')),
            key        TEXT NOT NULL,
            value_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (namespace, key)
        );

        CREATE TABLE font_file_cache (
            location_key          TEXT PRIMARY KEY,
            display_path          TEXT NOT NULL,
            file_size             INTEGER NOT NULL,
            modified_at_ns        INTEGER NOT NULL,
            parser_schema_version INTEGER NOT NULL,
            parsed_fonts_json     TEXT NOT NULL,
            parsed_at             INTEGER NOT NULL
        );",
    )?;

    for (sort_order, language) in [
        "English", "Chinese", "Japanese", "Korean", "Russian", "Arabic", "Unknown",
    ]
    .iter()
    .enumerate()
    {
        let id = format!("preset-language-{}", language.to_lowercase());
        let criteria = serde_json::json!({
            "languages": [language],
            "styles": []
        });

        transaction.execute(
            "INSERT INTO saved_filters (
                id, name, name_key, group_name, criteria_json, sort_order, created_at, updated_at
            ) VALUES (?1, ?2, ?3, 'language', ?4, ?5, unixepoch(), unixepoch())",
            params![
                id,
                language,
                language.to_lowercase(),
                criteria.to_string(),
                sort_order as i64
            ],
        )?;
    }

    transaction.execute(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, unixepoch())",
        [1],
    )?;
    transaction.commit()?;
    Ok(())
}

fn apply_v2(connection: &mut Connection) -> PersistenceResult<()> {
    let transaction = connection.transaction()?;
    let records = {
        let mut statement = transaction.prepare("SELECT id, criteria_json FROM saved_filters")?;
        let rows = statement.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        rows.collect::<Result<Vec<_>, _>>()?
    };
    for (id, json) in records {
        let mut criteria: serde_json::Value = serde_json::from_str(&json)?;
        let object = criteria.as_object_mut()
            .ok_or_else(|| PersistenceError::LegacyFilterCriteria(id.clone()))?;
        if let Some(styles) = object.get("styles") {
            if styles.as_array().map_or(true, |values| !values.is_empty()) {
                return Err(PersistenceError::LegacyFilterCriteria(id));
            }
        }
        object.remove("styles");
        object.entry("categories").or_insert_with(|| serde_json::json!([]));
        transaction.execute(
            "UPDATE saved_filters SET criteria_json = ?2 WHERE id = ?1",
            params![id, criteria.to_string()],
        )?;
    }
    transaction.execute(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (2, unixepoch())",
        [],
    )?;
    transaction.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{migrate, LATEST_SCHEMA_VERSION};
    use crate::persistence::PersistenceError;
    use rusqlite::Connection;

    #[test]
    fn migration_is_idempotent_and_seeds_language_filters_once() {
        let mut connection = Connection::open_in_memory().unwrap();

        migrate(&mut connection).unwrap();
        migrate(&mut connection).unwrap();

        let version: i64 = connection
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .unwrap();
        let filter_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM saved_filters", [], |row| row.get(0))
            .unwrap();

        assert_eq!(version, LATEST_SCHEMA_VERSION);
        assert_eq!(filter_count, 7);
    }

    #[test]
    fn rejects_a_database_from_a_newer_application_version() {
        let mut connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                "CREATE TABLE schema_migrations (
                    version INTEGER PRIMARY KEY,
                    applied_at INTEGER NOT NULL
                );
                INSERT INTO schema_migrations (version, applied_at) VALUES (99, 0);",
            )
            .unwrap();

        let error = migrate(&mut connection).unwrap_err();
        assert!(matches!(
            error,
            PersistenceError::UnsupportedSchemaVersion {
                current: 99,
                supported: LATEST_SCHEMA_VERSION
            }
        ));
    }

    #[test]
    fn converts_empty_legacy_styles_without_reinterpreting_nonempty_styles() {
        let mut connection = Connection::open_in_memory().unwrap();
        connection.execute_batch("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);").unwrap();
        super::apply_v1(&mut connection).unwrap();
        connection.execute(
            "UPDATE saved_filters SET criteria_json = ?1 WHERE id = 'preset-language-english'",
            [r#"{"languages":["English"],"styles":["Italic"]}"#],
        ).unwrap();
        assert!(matches!(migrate(&mut connection), Err(PersistenceError::LegacyFilterCriteria(_))));
        let version: i64 = connection.query_row("SELECT MAX(version) FROM schema_migrations", [], |r| r.get(0)).unwrap();
        assert_eq!(version, 1);
        connection.execute(
            "UPDATE saved_filters SET criteria_json = ?1 WHERE id = 'preset-language-english'",
            [r#"{"languages":["English"],"styles":[]}"#],
        ).unwrap();
        migrate(&mut connection).unwrap();
        let json: String = connection.query_row("SELECT criteria_json FROM saved_filters WHERE id = 'preset-language-english'", [], |r| r.get(0)).unwrap();
        let criteria: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(criteria["categories"], serde_json::json!([]));
        assert!(criteria.get("styles").is_none());
    }
}
