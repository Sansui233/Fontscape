use super::{FilterCriteria, FilterGroup, SavedFilter};
use crate::persistence::{Database, PersistenceResult};
use rusqlite::{params, OptionalExtension, Row};

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
        let mut statement = connection.prepare(
            "SELECT id, name, group_name, criteria_json, sort_order, created_at, updated_at
             FROM saved_filters
             ORDER BY CASE group_name WHEN 'language' THEN 0 ELSE 1 END, sort_order, name_key",
        )?;
        let rows = statement.query_map([], map_filter_row)?;

        let mut filters = Vec::new();
        for row in rows {
            filters.push(row?);
        }
        Ok(filters)
    }

    pub fn find_by_id(&self, id: &str) -> PersistenceResult<Option<SavedFilter>> {
        let connection = self.database.open_connection()?;
        connection
            .query_row(
                "SELECT id, name, group_name, criteria_json, sort_order, created_at, updated_at
                 FROM saved_filters WHERE id = ?1",
                [id],
                map_filter_row,
            )
            .optional()
            .map_err(Into::into)
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

    pub fn create_saved(
        &self,
        name: &str,
        name_key: &str,
        criteria: &FilterCriteria,
    ) -> PersistenceResult<SavedFilter> {
        let mut connection = self.database.open_connection()?;
        let transaction = connection.transaction()?;
        let id: String =
            transaction.query_row("SELECT lower(hex(randomblob(16)))", [], |row| row.get(0))?;
        let criteria_json = serde_json::to_string(criteria)?;

        transaction.execute(
            "INSERT INTO saved_filters (
                id, name, name_key, group_name, criteria_json, sort_order, created_at, updated_at
             ) VALUES (
                ?1, ?2, ?3, 'saved', ?4,
                COALESCE((SELECT MAX(sort_order) + 1 FROM saved_filters WHERE group_name = 'saved'), 0),
                unixepoch(), unixepoch()
             )",
            params![id, name, name_key, criteria_json],
        )?;
        transaction.commit()?;

        self.find_by_id(&id)?
            .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows.into())
    }

    pub fn update(
        &self,
        id: &str,
        name: &str,
        name_key: &str,
        criteria: &FilterCriteria,
    ) -> PersistenceResult<Option<SavedFilter>> {
        let connection = self.database.open_connection()?;
        let criteria_json = serde_json::to_string(criteria)?;
        let changed = connection.execute(
            "UPDATE saved_filters
             SET name = ?2, name_key = ?3, criteria_json = ?4, updated_at = unixepoch()
             WHERE id = ?1",
            params![id, name, name_key, criteria_json],
        )?;

        if changed == 0 {
            return Ok(None);
        }
        self.find_by_id(id)
    }

    pub fn delete(&self, id: &str) -> PersistenceResult<bool> {
        let connection = self.database.open_connection()?;
        let changed = connection.execute("DELETE FROM saved_filters WHERE id = ?1", [id])?;
        Ok(changed > 0)
    }
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
        sort_order: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}
