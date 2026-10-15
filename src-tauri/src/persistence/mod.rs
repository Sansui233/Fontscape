mod database;
pub mod migrations;

pub use database::Database;

use std::fmt;

pub type PersistenceResult<T> = Result<T, PersistenceError>;

#[derive(Debug)]
pub enum PersistenceError {
    Database(rusqlite::Error),
    Io(std::io::Error),
    Json(serde_json::Error),
    LegacyFilterCriteria(String),
    UnsupportedSchemaVersion { current: i64, supported: i64 },
}

impl fmt::Display for PersistenceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "database error: {error}"),
            Self::Io(error) => write!(formatter, "filesystem error: {error}"),
            Self::Json(error) => write!(formatter, "JSON error: {error}"),
            Self::LegacyFilterCriteria(id) => write!(formatter, "filter {id} contains legacy style criteria; category conversion requires explicit correction (database unchanged)"),
            Self::UnsupportedSchemaVersion { current, supported } => write!(
                formatter,
                "database schema version {current} is newer than supported version {supported}"
            ),
        }
    }
}

impl std::error::Error for PersistenceError {}

impl From<rusqlite::Error> for PersistenceError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

impl From<std::io::Error> for PersistenceError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<serde_json::Error> for PersistenceError {
    fn from(error: serde_json::Error) -> Self {
        Self::Json(error)
    }
}
