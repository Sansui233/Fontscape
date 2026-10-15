use super::migrations;
use super::PersistenceResult;
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Database {
    path: PathBuf,
}

impl Database {
    pub fn initialize(path: PathBuf) -> PersistenceResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let database = Self { path };
        let mut connection = database.open_connection()?;
        migrations::migrate(&mut connection)?;
        Ok(database)
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub(crate) fn open_connection(&self) -> PersistenceResult<Connection> {
        let connection = Connection::open(&self.path)?;
        connection.busy_timeout(Duration::from_secs(5))?;
        connection.pragma_update(None, "foreign_keys", true)?;
        Ok(connection)
    }
}
