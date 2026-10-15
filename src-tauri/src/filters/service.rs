use super::{CreateFilterInput, FilterCriteria, FilterRepository, SavedFilter, UpdateFilterInput};
use crate::persistence::PersistenceError;
use std::fmt;

#[derive(Debug, Clone)]
pub struct FilterService {
    repository: FilterRepository,
}

impl FilterService {
    pub fn new(repository: FilterRepository) -> Self {
        Self { repository }
    }

    pub fn list(&self) -> Result<Vec<SavedFilter>, FilterError> {
        Ok(self.repository.list()?)
    }

    pub fn create(&self, input: CreateFilterInput) -> Result<SavedFilter, FilterError> {
        let (name, name_key) = validate_name(&input.name)?;
        validate_criteria(&input.criteria)?;

        if self.repository.name_exists(&name_key, None)? {
            return Err(FilterError::NameConflict);
        }

        self.repository
            .create_saved(&name, &name_key, &input.criteria)
            .map_err(map_write_error)
    }

    pub fn update(&self, input: UpdateFilterInput) -> Result<SavedFilter, FilterError> {
        let (name, name_key) = validate_name(&input.name)?;
        validate_criteria(&input.criteria)?;

        if self.repository.name_exists(&name_key, Some(&input.id))? {
            return Err(FilterError::NameConflict);
        }

        self.repository
            .update(&input.id, &name, &name_key, &input.criteria)
            .map_err(map_write_error)?
            .ok_or(FilterError::NotFound)
    }

    pub fn delete(&self, id: &str) -> Result<(), FilterError> {
        if self.repository.delete(id)? {
            Ok(())
        } else {
            Err(FilterError::NotFound)
        }
    }
}

fn validate_name(value: &str) -> Result<(String, String), FilterError> {
    let name = value.trim();
    if name.is_empty() || name.chars().count() > 64 {
        return Err(FilterError::InvalidName);
    }
    Ok((name.to_string(), name.to_lowercase()))
}

fn validate_criteria(criteria: &FilterCriteria) -> Result<(), FilterError> {
    if criteria.languages.is_empty() && criteria.categories.is_empty() {
        Err(FilterError::EmptyCriteria)
    } else {
        Ok(())
    }
}

fn map_write_error(error: PersistenceError) -> FilterError {
    if let PersistenceError::Database(rusqlite::Error::SqliteFailure(details, _)) = &error {
        if details.code == rusqlite::ErrorCode::ConstraintViolation {
            return FilterError::NameConflict;
        }
    }
    FilterError::Persistence(error)
}

#[derive(Debug)]
pub enum FilterError {
    InvalidName,
    EmptyCriteria,
    NameConflict,
    NotFound,
    Persistence(PersistenceError),
}

impl fmt::Display for FilterError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidName => write!(formatter, "filter name must contain 1 to 64 characters"),
            Self::EmptyCriteria => write!(formatter, "filter must contain at least one criterion"),
            Self::NameConflict => write!(formatter, "a filter with this name already exists"),
            Self::NotFound => write!(formatter, "filter was not found"),
            Self::Persistence(error) => error.fmt(formatter),
        }
    }
}

impl std::error::Error for FilterError {}

impl From<PersistenceError> for FilterError {
    fn from(error: PersistenceError) -> Self {
        Self::Persistence(error)
    }
}

#[cfg(test)]
mod tests {
    use super::{FilterError, FilterService};
    use crate::filters::{CreateFilterInput, FilterCriteria, FilterRepository, UpdateFilterInput};
    use crate::persistence::Database;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TestDatabase {
        path: PathBuf,
    }

    impl TestDatabase {
        fn create() -> (Self, FilterService) {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let path = std::env::temp_dir().join(format!(
                "fontscape-filter-test-{}-{unique}.db",
                std::process::id()
            ));
            let database = Database::initialize(path.clone()).unwrap();
            assert!(path.is_file());
            let service = FilterService::new(FilterRepository::new(database));
            (Self { path }, service)
        }
    }

    impl Drop for TestDatabase {
        fn drop(&mut self) {
            let _ = std::fs::remove_file(&self.path);
        }
    }

    fn criteria(language: &str, category: &str) -> FilterCriteria {
        FilterCriteria {
            languages: vec![language.to_string()],
            categories: vec![category.to_string()],
        }
    }

    #[test]
    fn seeded_filters_and_crud_round_trip() {
        let (_database, service) = TestDatabase::create();
        assert_eq!(service.list().unwrap().len(), 7);

        let created = service
            .create(CreateFilterInput {
                name: "Body Fonts".to_string(),
                criteria: criteria("English", "Sans Serif"),
            })
            .unwrap();
        assert_eq!(created.name, "Body Fonts");
        assert_eq!(service.list().unwrap().len(), 8);

        let updated = service
            .update(UpdateFilterInput {
                id: created.id.clone(),
                name: "Body Italic".to_string(),
                criteria: criteria("English", "Serif"),
            })
            .unwrap();
        assert_eq!(updated.criteria.categories, ["Serif"]);

        service.delete(&created.id).unwrap();
        assert_eq!(service.list().unwrap().len(), 7);
    }

    #[test]
    fn validates_names_criteria_and_conflicts_before_writing() {
        let (_database, service) = TestDatabase::create();

        let empty_name = service.create(CreateFilterInput {
            name: "   ".to_string(),
            criteria: criteria("English", "Sans Serif"),
        });
        assert!(matches!(empty_name, Err(FilterError::InvalidName)));

        let empty_criteria = service.create(CreateFilterInput {
            name: "Empty".to_string(),
            criteria: FilterCriteria::default(),
        });
        assert!(matches!(empty_criteria, Err(FilterError::EmptyCriteria)));

        let conflict = service.create(CreateFilterInput {
            name: "english".to_string(),
            criteria: criteria("English", "Sans Serif"),
        });
        assert!(matches!(conflict, Err(FilterError::NameConflict)));
        assert_eq!(service.list().unwrap().len(), 7);
    }

    #[test]
    fn deleted_language_preset_is_not_reseeded_on_restart() {
        let (database, service) = TestDatabase::create();
        service.delete("preset-language-english").unwrap();
        drop(service);

        let reopened = Database::initialize(database.path.clone()).unwrap();
        let reopened_service = FilterService::new(FilterRepository::new(reopened));

        assert_eq!(reopened_service.list().unwrap().len(), 6);
    }
}
