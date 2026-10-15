use crate::filters::{FilterRepository, FilterService};
use crate::persistence::{Database, PersistenceResult};
use std::path::PathBuf;

#[derive(Debug)]
pub struct AppServices {
    pub database: Database,
    pub filters: FilterService,
}

impl AppServices {
    pub fn initialize(database_path: PathBuf) -> PersistenceResult<Self> {
        let database = Database::initialize(database_path)?;
        let filters = FilterService::new(FilterRepository::new(database.clone()));
        Ok(Self { database, filters })
    }
}
