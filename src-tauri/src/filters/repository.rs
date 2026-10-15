use super::{DeleteFolderMode, FilterCriteria, FilterFolder, FilterGroup, SavedFilter};
use crate::persistence::{Database, PersistenceResult};
use rusqlite::{params, Connection, OptionalExtension, Row};

const FILTER_COLUMNS: &str =
    "id, name, group_name, criteria_json, folder_id, sort_order, created_at, updated_at";
const FOLDER_COLUMNS: &str = "id, name, parent_id, sort_order, created_at, updated_at";

#[derive(Debug, Clone)]
pub struct FilterRepository {
    database: Database,
}

impl FilterRepository {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub fn list(&self) -> PersistenceResult<Vec<SavedFilter>> {
        let connection = self.database.open_connection()?;
        let mut statement = connection.prepare(&format!(
            "SELECT {FILTER_COLUMNS} FROM saved_filters
             ORDER BY CASE group_name WHEN 'language' THEN 0 ELSE 1 END, sort_order, name_key"
        ))?;
        let rows = statement.query_map([], map_filter_row)?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    pub fn find_by_id(&self, id: &str) -> PersistenceResult<Option<SavedFilter>> {
        let connection = self.database.open_connection()?;
        find_in(&connection, id)
    }

    pub fn name_exists(
        &self,
        name_key: &str,
        excluding_id: Option<&str>,
    ) -> PersistenceResult<bool> {
        let connection = self.database.open_connection()?;
        let count: i64 = connection.query_row(
            "SELECT COUNT(*) FROM saved_filters
             WHERE name_key = ?1 AND (?2 IS NULL OR id <> ?2)",
            params![name_key, excluding_id],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    /// 写入与读回在同一事务内完成：提交成功才返回记录，避免「已保存但返回失败」
    pub fn create_saved(
        &self,
        name: &str,
        name_key: &str,
        criteria: &FilterCriteria,
        folder_id: Option<&str>,
    ) -> PersistenceResult<SavedFilter> {
        let mut connection = self.database.open_connection()?;
        let transaction = connection.transaction()?;
        let id = new_id(&transaction)?;
        let criteria_json = serde_json::to_string(criteria)?;

        transaction.execute(
            "INSERT INTO saved_filters (
                id, name, name_key, group_name, criteria_json, folder_id, sort_order, created_at, updated_at
             ) VALUES (
                ?1, ?2, ?3, 'saved', ?4, ?5,
                COALESCE((SELECT MAX(sort_order) + 1 FROM saved_filters WHERE group_name = 'saved'), 0),
                unixepoch(), unixepoch()
             )",
            params![id, name, name_key, criteria_json, folder_id],
        )?;
        let created = find_in(&transaction, &id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)?;
        transaction.commit()?;
        Ok(created)
    }

    pub fn update(
        &self,
        id: &str,
        name: &str,
        name_key: &str,
        criteria: &FilterCriteria,
        folder_id: Option<&str>,
    ) -> PersistenceResult<Option<SavedFilter>> {
        let mut connection = self.database.open_connection()?;
        let transaction = connection.transaction()?;
        let criteria_json = serde_json::to_string(criteria)?;
        let changed = transaction.execute(
            "UPDATE saved_filters
             SET name = ?2, name_key = ?3, criteria_json = ?4, folder_id = ?5, updated_at = unixepoch()
             WHERE id = ?1",
            params![id, name, name_key, criteria_json, folder_id],
        )?;

        if changed == 0 {
            return Ok(None);
        }
        let updated = find_in(&transaction, id)?;
        transaction.commit()?;
        Ok(updated)
    }

    pub fn move_filter(&self, id: &str, folder_id: Option<&str>) -> PersistenceResult<bool> {
        let connection = self.database.open_connection()?;
        let changed = connection.execute(
            "UPDATE saved_filters SET folder_id = ?2, updated_at = unixepoch()
             WHERE id = ?1 AND group_name = 'saved'",
            params![id, folder_id],
        )?;
        Ok(changed > 0)
    }

    pub fn delete(&self, id: &str) -> PersistenceResult<bool> {
        let connection = self.database.open_connection()?;
        let changed = connection.execute("DELETE FROM saved_filters WHERE id = ?1", [id])?;
        Ok(changed > 0)
    }

    pub fn list_folders(&self) -> PersistenceResult<Vec<FilterFolder>> {
        let connection = self.database.open_connection()?;
        let mut statement = connection.prepare(&format!(
            "SELECT {FOLDER_COLUMNS} FROM filter_folders ORDER BY sort_order, lower(name)"
        ))?;
        let rows = statement.query_map([], map_folder_row)?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    pub fn find_folder(&self, id: &str) -> PersistenceResult<Option<FilterFolder>> {
        let connection = self.database.open_connection()?;
        find_folder_in(&connection, id)
    }

    pub fn create_folder(&self, name: &str, parent_id: Option<&str>) -> PersistenceResult<FilterFolder> {
        let mut connection = self.database.open_connection()?;
        let transaction = connection.transaction()?;
        let id = new_id(&transaction)?;
        transaction.execute(
            "INSERT INTO filter_folders (id, name, parent_id, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3,
                COALESCE((SELECT MAX(sort_order) + 1 FROM filter_folders), 0),
                unixepoch(), unixepoch())",
            params![id, name, parent_id],
        )?;
        let created = find_folder_in(&transaction, &id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)?;
        transaction.commit()?;
        Ok(created)
    }

    pub fn rename_folder(&self, id: &str, name: &str) -> PersistenceResult<Option<FilterFolder>> {
        let mut connection = self.database.open_connection()?;
        let transaction = connection.transaction()?;
        let changed = transaction.execute(
            "UPDATE filter_folders SET name = ?2, updated_at = unixepoch() WHERE id = ?1",
            params![id, name],
        )?;
        if changed == 0 {
            return Ok(None);
        }
        let renamed = find_folder_in(&transaction, id)?;
        transaction.commit()?;
        Ok(renamed)
    }

    pub fn move_folder(&self, id: &str, parent_id: Option<&str>) -> PersistenceResult<bool> {
        let connection = self.database.open_connection()?;
        let changed = connection.execute(
            "UPDATE filter_folders SET parent_id = ?2, updated_at = unixepoch() WHERE id = ?1",
            params![id, parent_id],
        )?;
        Ok(changed > 0)
    }

    /// 返回被删除的筛选 ID，供调用方判断当前筛选是否受影响
    pub fn delete_folder(&self, id: &str, mode: DeleteFolderMode) -> PersistenceResult<Option<Vec<String>>> {
        let mut connection = self.database.open_connection()?;
        let transaction = connection.transaction()?;
        let Some(folder) = find_folder_in(&transaction, id)? else {
            return Ok(None);
        };

        let deleted_filters = match mode {
            DeleteFolderMode::MoveContentsUp => {
                transaction.execute(
                    "UPDATE saved_filters SET folder_id = ?2 WHERE folder_id = ?1",
                    params![id, folder.parent_id],
                )?;
                transaction.execute(
                    "UPDATE filter_folders SET parent_id = ?2 WHERE parent_id = ?1",
                    params![id, folder.parent_id],
                )?;
                transaction.execute("DELETE FROM filter_folders WHERE id = ?1", [id])?;
                Vec::new()
            }
            DeleteFolderMode::DeleteContents => {
                // 收集整棵子树的文件夹 ID（含自身）
                let folder_ids: Vec<String> = {
                    let mut statement = transaction.prepare(
                        "WITH RECURSIVE subtree(id) AS (
                            SELECT ?1
                            UNION ALL
                            SELECT f.id FROM filter_folders f JOIN subtree s ON f.parent_id = s.id
                         )
                         SELECT id FROM subtree",
                    )?;
                    let rows = statement.query_map([id], |row| row.get(0))?;
                    rows.collect::<Result<_, _>>()?
                };

                let mut deleted = Vec::new();
                for folder_id in &folder_ids {
                    let mut statement =
                        transaction.prepare("SELECT id FROM saved_filters WHERE folder_id = ?1")?;
                    let rows = statement.query_map([folder_id], |row| row.get::<_, String>(0))?;
                    for row in rows {
                        deleted.push(row?);
                    }
                    transaction.execute("DELETE FROM saved_filters WHERE folder_id = ?1", [folder_id])?;
                }
                // 先断开子树内的父子引用，外键约束下才能删除
                for folder_id in &folder_ids {
                    transaction.execute(
                        "UPDATE filter_folders SET parent_id = NULL WHERE id = ?1",
                        [folder_id],
                    )?;
                }
                for folder_id in &folder_ids {
                    transaction.execute("DELETE FROM filter_folders WHERE id = ?1", [folder_id])?;
                }
                deleted
            }
        };

        transaction.commit()?;
        Ok(Some(deleted_filters))
    }
}

fn new_id(connection: &Connection) -> rusqlite::Result<String> {
    connection.query_row("SELECT lower(hex(randomblob(16)))", [], |row| row.get(0))
}

fn find_in(connection: &Connection, id: &str) -> PersistenceResult<Option<SavedFilter>> {
    connection
        .query_row(
            &format!("SELECT {FILTER_COLUMNS} FROM saved_filters WHERE id = ?1"),
            [id],
            map_filter_row,
        )
        .optional()
        .map_err(Into::into)
}

fn find_folder_in(connection: &Connection, id: &str) -> PersistenceResult<Option<FilterFolder>> {
    connection
        .query_row(
            &format!("SELECT {FOLDER_COLUMNS} FROM filter_folders WHERE id = ?1"),
            [id],
            map_folder_row,
        )
        .optional()
        .map_err(Into::into)
}

fn map_filter_row(row: &Row<'_>) -> rusqlite::Result<SavedFilter> {
    let group_name: String = row.get(2)?;
    let criteria_json: String = row.get(3)?;

    let group_name = match group_name.as_str() {
        "language" => FilterGroup::Language,
        "saved" => FilterGroup::Saved,
        value => {
            return Err(rusqlite::Error::FromSqlConversionFailure(
                2,
                rusqlite::types::Type::Text,
                format!("unsupported filter group: {value}").into(),
            ));
        }
    };
    let criteria = serde_json::from_str(&criteria_json).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Text, Box::new(error))
    })?;

    Ok(SavedFilter {
        id: row.get(0)?,
        name: row.get(1)?,
        group_name,
        criteria,
        folder_id: row.get(4)?,
        sort_order: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn map_folder_row(row: &Row<'_>) -> rusqlite::Result<FilterFolder> {
    Ok(FilterFolder {
        id: row.get(0)?,
        name: row.get(1)?,
        parent_id: row.get(2)?,
        sort_order: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}
