use crate::filters::{FilterRepository, FilterService};
use crate::font::{FontCache, FontScanner};
use crate::persistence::{Database, PersistenceResult};
use crate::settings::SettingsRepository;
use crate::tags::TagService;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug)]
pub struct AppServices {
    pub database: Database,
    pub filters: FilterService,
    pub fonts: FontCache,
    pub settings: SettingsRepository,
    pub tags: TagService,
}

impl AppServices {
    pub fn initialize(database_path: PathBuf) -> PersistenceResult<Self> {
        let database = Database::initialize(database_path)?;
        let filters = FilterService::new(FilterRepository::new(database.clone()));
        let fonts = FontCache::new(database.clone(), FontScanner::new().font_dirs().to_vec());
        let settings = SettingsRepository::new(database.clone());
        let tags = TagService::new(database.clone());
        Ok(Self {
            database,
            filters,
            fonts,
            settings,
            tags,
        })
    }
}

/// Tauri 托管的状态。数据库初始化失败时仍启动应用，由 bootstrap 把原因展示给用户；
/// 服务放在 RwLock 中，重建数据库后可原地替换，无需重启。
pub struct AppState {
    pub database_path: PathBuf,
    pub services: RwLock<Result<AppServices, String>>,
}

impl AppState {
    pub fn initialize(database_path: PathBuf) -> Self {
        let services = Self::open(&database_path);
        Self {
            database_path,
            services: RwLock::new(services),
        }
    }

    fn open(database_path: &Path) -> Result<AppServices, String> {
        AppServices::initialize(database_path.to_path_buf())
            .map_err(|error| format!("{error}（数据库：{}）", database_path.display()))
    }

    /// 把现有数据库改名备份，再新建一个空数据库。返回备份文件路径（原本没有数据库时为 None）。
    pub fn reset_database(&self) -> Result<Option<PathBuf>, String> {
        let mut services = self
            .services
            .write()
            .map_err(|_| "database lock poisoned".to_string())?;
        // 等正在进行的 reconcile 结束，避免它把结果写进新库
        let _reconcile = crate::font::cache::lock();

        let backup = if self.database_path.exists() {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_secs())
                .unwrap_or_default();
            let backup = self.database_path.with_extension(format!("db.bak-{timestamp}"));
            std::fs::rename(&self.database_path, &backup)
                .map_err(|error| format!("could not back up database: {error}"))?;
            Some(backup)
        } else {
            None
        };

        *services = Self::open(&self.database_path);
        services.as_ref().map_err(Clone::clone)?;
        Ok(backup)
    }
}

#[cfg(test)]
mod tests {
    use super::AppState;

    #[test]
    fn reset_backs_up_and_recreates_database() {
        let dir = std::env::temp_dir().join(format!("fontscape-reset-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let state = AppState::initialize(dir.join("fontscape.db"));

        {
            let guard = state.services.read().unwrap();
            let services = guard.as_ref().unwrap();
            services.filters.delete("preset-language-english").unwrap();
            assert_eq!(services.filters.list().unwrap().len(), 6);
        }

        let backup = state.reset_database().unwrap().expect("backup should exist");
        assert!(backup.is_file());

        let guard = state.services.read().unwrap();
        assert_eq!(guard.as_ref().unwrap().filters.list().unwrap().len(), 7);
        drop(guard);
        let _ = std::fs::remove_dir_all(dir);
    }
}
