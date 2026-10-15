use super::{
    CreateFilterInput, CreateFolderInput, DeleteFolderMode, FilterCriteria, FilterFolder, FilterGroup,
    FilterRepository, SavedFilter, UpdateFilterInput,
};
use crate::font::{classifier, LANGUAGES};
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
        let criteria = normalize_criteria(input.criteria)?;

        if self.repository.name_exists(&name_key, None)? {
            return Err(FilterError::NameConflict);
        }
        self.ensure_folder(input.folder_id.as_deref())?;

        self.repository
            .create_saved(&name, &name_key, &criteria, input.folder_id.as_deref())
            .map_err(map_write_error)
    }

    pub fn update(&self, input: UpdateFilterInput) -> Result<SavedFilter, FilterError> {
        let (name, name_key) = validate_name(&input.name)?;
        let criteria = normalize_criteria(input.criteria)?;

        if self.repository.name_exists(&name_key, Some(&input.id))? {
            return Err(FilterError::NameConflict);
        }
        let existing = self.repository.find_by_id(&input.id)?.ok_or(FilterError::NotFound)?;
        // 语言预设固定在「语言」分组，不能放进文件夹
        let folder_id = match existing.group_name {
            FilterGroup::Language => None,
            FilterGroup::Saved => input.folder_id,
        };
        self.ensure_folder(folder_id.as_deref())?;

        self.repository
            .update(&input.id, &name, &name_key, &criteria, folder_id.as_deref())
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

    pub fn move_filter(&self, id: &str, folder_id: Option<&str>) -> Result<(), FilterError> {
        self.ensure_folder(folder_id)?;
        if self.repository.move_filter(id, folder_id)? {
            Ok(())
        } else {
            Err(FilterError::NotFound)
        }
    }

    pub fn list_folders(&self) -> Result<Vec<FilterFolder>, FilterError> {
        Ok(self.repository.list_folders()?)
    }

    pub fn create_folder(&self, input: CreateFolderInput) -> Result<FilterFolder, FilterError> {
        let (name, _) = validate_name(&input.name)?;
        self.ensure_folder(input.parent_id.as_deref())?;
        Ok(self.repository.create_folder(&name, input.parent_id.as_deref())?)
    }

    pub fn rename_folder(&self, id: &str, name: &str) -> Result<FilterFolder, FilterError> {
        let (name, _) = validate_name(name)?;
        self.repository
            .rename_folder(id, &name)?
            .ok_or(FilterError::FolderNotFound)
    }

    /// 移动文件夹；不能移到自身或自己的子文件夹中
    pub fn move_folder(&self, id: &str, parent_id: Option<&str>) -> Result<(), FilterError> {
        self.ensure_folder(parent_id)?;
        if let Some(target) = parent_id {
            let folders = self.repository.list_folders()?;
            let mut cursor = Some(target.to_string());
            while let Some(current) = cursor {
                if current == id {
                    return Err(FilterError::InvalidMove);
                }
                cursor = folders
                    .iter()
                    .find(|folder| folder.id == current)
                    .and_then(|folder| folder.parent_id.clone());
            }
        }
        if self.repository.move_folder(id, parent_id)? {
            Ok(())
        } else {
            Err(FilterError::FolderNotFound)
        }
    }

    /// 返回随文件夹一起删除的筛选 ID
    pub fn delete_folder(&self, id: &str, mode: DeleteFolderMode) -> Result<Vec<String>, FilterError> {
        self.repository
            .delete_folder(id, mode)?
            .ok_or(FilterError::FolderNotFound)
    }

    fn ensure_folder(&self, folder_id: Option<&str>) -> Result<(), FilterError> {
        match folder_id {
            Some(id) if self.repository.find_folder(id)?.is_none() => Err(FilterError::FolderNotFound),
            _ => Ok(()),
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

/// 只接受已知的 Language / Category 值，并按固定顺序去重，保证存储的条件有意义且稳定
pub fn normalize_criteria(criteria: FilterCriteria) -> Result<FilterCriteria, FilterError> {
    let normalized = FilterCriteria {
        languages: normalize_values(&criteria.languages, LANGUAGES)?,
        categories: normalize_values(&criteria.categories, classifier::CATEGORIES)?,
        name_contains: normalize_text(&criteria.name_contains)?,
        tag_contains: normalize_text(&criteria.tag_contains)?,
    };
    if normalized.languages.is_empty()
        && normalized.categories.is_empty()
        && normalized.name_contains.is_empty()
        && normalized.tag_contains.is_empty()
    {
        Err(FilterError::EmptyCriteria)
    } else {
        Ok(normalized)
    }
}

const MAX_TEXT_CRITERION_LENGTH: usize = 100;

fn normalize_text(value: &str) -> Result<String, FilterError> {
    let trimmed = value.trim();
    if trimmed.chars().count() > MAX_TEXT_CRITERION_LENGTH {
        return Err(FilterError::InvalidCriteria(trimmed.chars().take(20).collect()));
    }
    Ok(trimmed.to_string())
}

fn normalize_values(values: &[String], allowed: &[&str]) -> Result<Vec<String>, FilterError> {
    if let Some(unknown) = values.iter().find(|value| !allowed.contains(&value.as_str())) {
        return Err(FilterError::InvalidCriteria(unknown.clone()));
    }
    Ok(allowed
        .iter()
        .filter(|option| values.iter().any(|value| value == *option))
        .map(|option| option.to_string())
        .collect())
}

/// 只有 name_key 唯一约束冲突才视为重名，其余数据库错误保留原因
fn map_write_error(error: PersistenceError) -> FilterError {
    if let PersistenceError::Database(rusqlite::Error::SqliteFailure(details, Some(message))) = &error {
        if details.code == rusqlite::ErrorCode::ConstraintViolation
            && message.contains("saved_filters.name_key")
        {
            return FilterError::NameConflict;
        }
    }
    FilterError::Persistence(error)
}

#[derive(Debug)]
pub enum FilterError {
    InvalidName,
    EmptyCriteria,
    InvalidCriteria(String),
    NameConflict,
    NotFound,
    FolderNotFound,
    InvalidMove,
    Persistence(PersistenceError),
}

impl fmt::Display for FilterError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidName => write!(formatter, "filter name must contain 1 to 64 characters"),
            Self::EmptyCriteria => write!(formatter, "filter must contain at least one criterion"),
            Self::InvalidCriteria(value) => write!(formatter, "unknown filter value: {value}"),
            Self::NameConflict => write!(formatter, "a filter with this name already exists"),
            Self::NotFound => write!(formatter, "filter was not found"),
            Self::FolderNotFound => write!(formatter, "folder was not found"),
            Self::InvalidMove => write!(formatter, "a folder cannot be moved into itself"),
            Self::Persistence(error) => error.fmt(formatter),
        }
    }
}

impl std::error::Error for FilterError {}

impl FilterError {
    /// 前端用于区分错误类型的稳定 code
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidName => "invalid_name",
            Self::EmptyCriteria => "empty_criteria",
            Self::InvalidCriteria(_) => "invalid_criteria",
            Self::NameConflict => "name_conflict",
            Self::NotFound => "not_found",
            Self::FolderNotFound => "folder_not_found",
            Self::InvalidMove => "invalid_move",
            Self::Persistence(_) => "storage",
        }
    }
}

impl From<PersistenceError> for FilterError {
    fn from(error: PersistenceError) -> Self {
        Self::Persistence(error)
    }
}

#[cfg(test)]
mod tests {
    use super::{FilterError, FilterService};
    use crate::filters::{
        CreateFilterInput, CreateFolderInput, DeleteFolderMode, FilterCriteria, FilterRepository,
        UpdateFilterInput,
    };
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
            ..Default::default()
        }
    }

    fn create_in(service: &FilterService, name: &str, folder_id: Option<&str>) -> String {
        service
            .create(CreateFilterInput {
                name: name.to_string(),
                criteria: FilterCriteria {
                    name_contains: "  Hei ".to_string(),
                    ..Default::default()
                },
                folder_id: folder_id.map(str::to_string),
            })
            .unwrap()
            .id
    }

    #[test]
    fn text_criteria_are_trimmed_and_count_as_conditions() {
        let (_database, service) = TestDatabase::create();
        let id = create_in(&service, "Hei", None);
        let filter = service.list().unwrap().into_iter().find(|f| f.id == id).unwrap();
        assert_eq!(filter.criteria.name_contains, "Hei");
    }

    #[test]
    fn folders_nest_move_and_delete_in_both_modes() {
        let (_database, service) = TestDatabase::create();
        let parent = service
            .create_folder(CreateFolderInput { name: "Work".into(), parent_id: None })
            .unwrap();
        let child = service
            .create_folder(CreateFolderInput { name: "CJK".into(), parent_id: Some(parent.id.clone()) })
            .unwrap();
        let in_parent = create_in(&service, "A", Some(&parent.id));
        let in_child = create_in(&service, "B", Some(&child.id));

        // 不能把父文件夹移进自己的子文件夹
        assert!(matches!(
            service.move_folder(&parent.id, Some(&child.id)),
            Err(FilterError::InvalidMove)
        ));

        // 只删父文件夹：内容上移到根目录
        assert!(service.delete_folder(&parent.id, DeleteFolderMode::MoveContentsUp).unwrap().is_empty());
        let folders = service.list_folders().unwrap();
        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].parent_id, None);
        let filters = service.list().unwrap();
        assert_eq!(filters.iter().find(|f| f.id == in_parent).unwrap().folder_id, None);

        // 连同内容删除
        let deleted = service.delete_folder(&child.id, DeleteFolderMode::DeleteContents).unwrap();
        assert_eq!(deleted, vec![in_child]);
        assert!(service.list_folders().unwrap().is_empty());
        assert_eq!(service.list().unwrap().len(), 8);
    }

    #[test]
    fn deleting_nested_folders_with_contents_removes_whole_subtree() {
        let (_database, service) = TestDatabase::create();
        let root = service.create_folder(CreateFolderInput { name: "R".into(), parent_id: None }).unwrap();
        let mid = service
            .create_folder(CreateFolderInput { name: "M".into(), parent_id: Some(root.id.clone()) })
            .unwrap();
        service
            .create_folder(CreateFolderInput { name: "L".into(), parent_id: Some(mid.id.clone()) })
            .unwrap();
        create_in(&service, "Deep", Some(&mid.id));

        let deleted = service.delete_folder(&root.id, DeleteFolderMode::DeleteContents).unwrap();
        assert_eq!(deleted.len(), 1);
        assert!(service.list_folders().unwrap().is_empty());
    }

    #[test]
    fn seeded_filters_and_crud_round_trip() {
        let (_database, service) = TestDatabase::create();
        assert_eq!(service.list().unwrap().len(), 7);

        let created = service
            .create(CreateFilterInput {
                name: "Body Fonts".to_string(),
                criteria: criteria("English", "Sans Serif"),
                folder_id: None,
            })
            .unwrap();
        assert_eq!(created.name, "Body Fonts");
        assert_eq!(service.list().unwrap().len(), 8);

        let updated = service
            .update(UpdateFilterInput {
                id: created.id.clone(),
                name: "Body Italic".to_string(),
                criteria: criteria("English", "Serif"),
                folder_id: None,
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
            folder_id: None,
        });
        assert!(matches!(empty_name, Err(FilterError::InvalidName)));

        let empty_criteria = service.create(CreateFilterInput {
            name: "Empty".to_string(),
            criteria: FilterCriteria::default(),
            folder_id: None,
        });
        assert!(matches!(empty_criteria, Err(FilterError::EmptyCriteria)));

        let conflict = service.create(CreateFilterInput {
            name: "english".to_string(),
            criteria: criteria("English", "Sans Serif"),
            folder_id: None,
        });
        assert!(matches!(conflict, Err(FilterError::NameConflict)));

        let unknown_value = service.create(CreateFilterInput {
            name: "Bad".to_string(),
            criteria: criteria("Klingon", "Sans Serif"),
            folder_id: None,
        });
        assert!(matches!(unknown_value, Err(FilterError::InvalidCriteria(_))));
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
