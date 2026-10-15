//! 用户自定义标签。标签打在字体家族（css_font_family）上，与界面中卡片的单位一致。

use crate::persistence::{Database, PersistenceError, PersistenceResult};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub created_at: i64,
}

/// 一条「家族 ↔ 标签」关系
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FamilyTag {
    pub family: String,
    pub tag_id: String,
}

#[derive(Debug)]
pub enum TagError {
    InvalidName,
    NameConflict,
    NotFound,
    Persistence(PersistenceError),
}

impl TagError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidName => "invalid_name",
            Self::NameConflict => "tag_name_conflict",
            Self::NotFound => "tag_not_found",
            Self::Persistence(_) => "storage",
        }
    }
}

impl fmt::Display for TagError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidName => write!(formatter, "tag name must contain 1 to 64 characters"),
            Self::NameConflict => write!(formatter, "a tag with this name already exists"),
            Self::NotFound => write!(formatter, "tag was not found"),
            Self::Persistence(error) => error.fmt(formatter),
        }
    }
}

impl From<PersistenceError> for TagError {
    fn from(error: PersistenceError) -> Self {
        Self::Persistence(error)
    }
}

impl From<rusqlite::Error> for TagError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Persistence(error.into())
    }
}

#[derive(Debug, Clone)]
pub struct TagService {
    database: Database,
}

impl TagService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub fn list(&self) -> Result<Vec<Tag>, TagError> {
        let connection = self.database.open_connection()?;
        let mut statement =
            connection.prepare("SELECT id, name, created_at FROM tags ORDER BY name_key")?;
        let rows = statement.query_map([], |row| {
            Ok(Tag { id: row.get(0)?, name: row.get(1)?, created_at: row.get(2)? })
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    pub fn list_assignments(&self) -> Result<Vec<FamilyTag>, TagError> {
        let connection = self.database.open_connection()?;
        let mut statement = connection.prepare("SELECT family, tag_id FROM font_tags")?;
        let rows = statement.query_map([], |row| {
            Ok(FamilyTag { family: row.get(0)?, tag_id: row.get(1)? })
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    pub fn create(&self, name: &str) -> Result<Tag, TagError> {
        let (name, name_key) = validate_name(name)?;
        let connection = self.database.open_connection()?;
        if self.name_exists(&connection, &name_key, None)? {
            return Err(TagError::NameConflict);
        }
        let id: String = connection.query_row("SELECT lower(hex(randomblob(16)))", [], |row| row.get(0))?;
        connection.execute(
            "INSERT INTO tags (id, name, name_key, created_at) VALUES (?1, ?2, ?3, unixepoch())",
            params![id, name, name_key],
        )?;
        self.find(&connection, &id)?.ok_or(TagError::NotFound)
    }

    pub fn rename(&self, id: &str, name: &str) -> Result<Tag, TagError> {
        let (name, name_key) = validate_name(name)?;
        let connection = self.database.open_connection()?;
        if self.name_exists(&connection, &name_key, Some(id))? {
            return Err(TagError::NameConflict);
        }
        let changed = connection.execute(
            "UPDATE tags SET name = ?2, name_key = ?3 WHERE id = ?1",
            params![id, name, name_key],
        )?;
        if changed == 0 {
            return Err(TagError::NotFound);
        }
        self.find(&connection, id)?.ok_or(TagError::NotFound)
    }

    pub fn delete(&self, id: &str) -> Result<(), TagError> {
        let mut connection = self.database.open_connection()?;
        let transaction = connection.transaction()?;
        transaction.execute("DELETE FROM font_tags WHERE tag_id = ?1", [id])?;
        let changed = transaction.execute("DELETE FROM tags WHERE id = ?1", [id])?;
        transaction.commit()?;
        if changed == 0 { Err(TagError::NotFound) } else { Ok(()) }
    }

    /// 给多个家族加上 / 去掉同一个标签
    pub fn set_families(&self, tag_id: &str, families: &[String], tagged: bool) -> Result<(), TagError> {
        let mut connection = self.database.open_connection()?;
        let transaction = connection.transaction()?;
        if self.find(&transaction, tag_id)?.is_none() {
            return Err(TagError::NotFound);
        }
        let sql = if tagged {
            "INSERT OR IGNORE INTO font_tags (family, tag_id) VALUES (?1, ?2)"
        } else {
            "DELETE FROM font_tags WHERE family = ?1 AND tag_id = ?2"
        };
        for family in families {
            transaction.execute(sql, params![family, tag_id])?;
        }
        transaction.commit()?;
        Ok(())
    }

    fn find(&self, connection: &rusqlite::Connection, id: &str) -> PersistenceResult<Option<Tag>> {
        Ok(connection
            .query_row("SELECT id, name, created_at FROM tags WHERE id = ?1", [id], |row| {
                Ok(Tag { id: row.get(0)?, name: row.get(1)?, created_at: row.get(2)? })
            })
            .optional()?)
    }

    fn name_exists(
        &self,
        connection: &rusqlite::Connection,
        name_key: &str,
        excluding_id: Option<&str>,
    ) -> PersistenceResult<bool> {
        let count: i64 = connection.query_row(
            "SELECT COUNT(*) FROM tags WHERE name_key = ?1 AND (?2 IS NULL OR id <> ?2)",
            params![name_key, excluding_id],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }
}

fn validate_name(value: &str) -> Result<(String, String), TagError> {
    let name = value.trim();
    if name.is_empty() || name.chars().count() > 64 {
        return Err(TagError::InvalidName);
    }
    Ok((name.to_string(), name.to_lowercase()))
}

#[cfg(test)]
mod tests {
    use super::{TagError, TagService};
    use crate::persistence::Database;

    #[test]
    fn tags_round_trip_and_assignments_follow_deletes() {
        let path = std::env::temp_dir().join(format!("fontscape-tags-test-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&path);
        let service = TagService::new(Database::initialize(path.clone()).unwrap());

        let tag = service.create(" 标题 ").unwrap();
        assert_eq!(tag.name, "标题");
        assert!(matches!(service.create("标题"), Err(TagError::NameConflict)));

        let families = vec!["Noto Sans SC".to_string(), "SimSun".to_string()];
        service.set_families(&tag.id, &families, true).unwrap();
        service.set_families(&tag.id, &families, true).unwrap(); // 重复添加无副作用
        assert_eq!(service.list_assignments().unwrap().len(), 2);

        service.set_families(&tag.id, &families[..1], false).unwrap();
        assert_eq!(service.list_assignments().unwrap().len(), 1);

        assert_eq!(service.rename(&tag.id, "Display").unwrap().name, "Display");
        service.delete(&tag.id).unwrap();
        assert!(service.list().unwrap().is_empty());
        assert!(service.list_assignments().unwrap().is_empty());
        let _ = std::fs::remove_file(path);
    }
}
