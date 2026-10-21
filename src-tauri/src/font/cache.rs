//! 字体解析缓存（font_file_cache 表）。每个字体文件一行，TTC 的全部 face 存在同一行。
//!
//! reconcile：列目录 → 与缓存比较大小、修改时间、解析版本 → 只解析新增与变化的文件
//! → 一个事务写回 → 返回完整 FontState 与变化计数。

use super::classifier::CLASSIFIER_VERSION;
use super::models::FontInfo;
use super::scanner::{FontScanner, PARSER_SCHEMA_VERSION};
use super::state::FontState;
use crate::persistence::{Database, PersistenceResult};
use rayon::prelude::*;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// 解析器与分类规则任一变化，缓存整体失效
const CACHE_VERSION: i64 = (PARSER_SCHEMA_VERSION as i64) * 1000 + CLASSIFIER_VERSION as i64;

/// 一次 reconcile 中变化的文件数
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct FontChanges {
    pub added: usize,
    pub modified: usize,
    pub removed: usize,
}

impl FontChanges {
    pub fn is_empty(&self) -> bool {
        self.added + self.modified + self.removed == 0
    }
}

struct CachedFile {
    display_path: String,
    file_size: i64,
    modified_at_ns: i64,
    version: i64,
    fonts_json: String,
}

#[derive(Debug, Clone)]
pub struct FontCache {
    database: Database,
    font_dirs: Vec<PathBuf>,
    /// 各个克隆共用，保证同一时间只有一次 reconcile：后到的一方能看到先到的一方写入的结果
    reconcile_lock: Arc<Mutex<()>>,
}

impl FontCache {
    pub fn new(database: Database, font_dirs: Vec<PathBuf>) -> Self {
        Self {
            database,
            font_dirs,
            reconcile_lock: Arc::default(),
        }
    }

    /// 只读缓存，不访问字体目录。没有当前版本的缓存时返回 None。
    pub fn load(&self) -> PersistenceResult<Option<FontState>> {
        let connection = self.database.open_connection()?;
        let mut statement = connection
            .prepare("SELECT parsed_fonts_json FROM font_file_cache WHERE parser_schema_version = ?1")?;
        let rows = statement
            .query_map([CACHE_VERSION], |row| row.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        if rows.is_empty() {
            return Ok(None);
        }
        // 损坏的记录先跳过，下一次 reconcile 会重新解析
        let fonts = rows
            .iter()
            .filter_map(|json| serde_json::from_str::<Vec<FontInfo>>(json).ok())
            .flatten()
            .collect();
        Ok(Some(FontState::new(fonts)))
    }

    /// force 为 true 时忽略缓存，重新解析全部文件
    pub fn reconcile(&self, force: bool) -> PersistenceResult<(FontState, FontChanges)> {
        let _guard = self.reconcile_lock.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let scanner = FontScanner::with_dirs(self.font_dirs.clone());
        let (files, failed_dirs) = scanner.list_font_files();
        let mut cached = self.load_rows()?;
        let mut changes = FontChanges::default();
        let mut fonts = Vec::new();
        let mut to_parse = Vec::new();

        for file in files {
            let key = location_key(&file.path);
            match cached.remove(&key) {
                None => changes.added += 1,
                Some(row) => {
                    let unchanged = !force
                        && row.version == CACHE_VERSION
                        && row.file_size == file.file_size as i64
                        && row.modified_at_ns == file.modified_at_ns;
                    // 记录损坏时按变化处理，重新解析
                    let parsed = unchanged
                        .then(|| serde_json::from_str::<Vec<FontInfo>>(&row.fonts_json).ok())
                        .flatten();
                    match parsed {
                        Some(parsed) => {
                            fonts.extend(parsed);
                            continue;
                        }
                        None => changes.modified += 1,
                    }
                }
            }
            to_parse.push((key, file));
        }

        // 剩下的记录在目录中已不存在；所在目录读取失败时保留
        let removed: Vec<String> = cached
            .into_iter()
            .filter(|(_, row)| !failed_dirs.iter().any(|dir| Path::new(&row.display_path).starts_with(dir)))
            .map(|(key, _)| key)
            .collect();
        changes.removed = removed.len();

        let parsed: Vec<_> = to_parse
            .into_par_iter()
            .map(|(key, file)| {
                // 解析失败也写入空结果，文件不变时不再重复解析
                let result = scanner.parse_font(&file.path).unwrap_or_else(|error| {
                    println!("Failed to parse {:?}: {}", file.path, error);
                    Vec::new()
                });
                (key, file, result)
            })
            .collect();

        let mut connection = self.database.open_connection()?;
        let transaction = connection.transaction()?;
        for (key, file, result) in &parsed {
            transaction.execute(
                "INSERT INTO font_file_cache (
                    location_key, display_path, file_size, modified_at_ns,
                    parser_schema_version, parsed_fonts_json, parsed_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, unixepoch())
                ON CONFLICT (location_key) DO UPDATE SET
                    display_path = excluded.display_path,
                    file_size = excluded.file_size,
                    modified_at_ns = excluded.modified_at_ns,
                    parser_schema_version = excluded.parser_schema_version,
                    parsed_fonts_json = excluded.parsed_fonts_json,
                    parsed_at = excluded.parsed_at",
                params![
                    key,
                    file.path.to_string_lossy(),
                    file.file_size as i64,
                    file.modified_at_ns,
                    CACHE_VERSION,
                    serde_json::to_string(result)?,
                ],
            )?;
        }
        for key in &removed {
            transaction.execute("DELETE FROM font_file_cache WHERE location_key = ?1", [key])?;
        }
        transaction.commit()?;

        fonts.extend(parsed.into_iter().flat_map(|(_, _, result)| result));
        Ok((FontState::new(fonts), changes))
    }

    fn load_rows(&self) -> PersistenceResult<HashMap<String, CachedFile>> {
        let connection = self.database.open_connection()?;
        let mut statement = connection.prepare(
            "SELECT location_key, display_path, file_size, modified_at_ns, parser_schema_version, parsed_fonts_json
             FROM font_file_cache",
        )?;
        let rows = statement.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                CachedFile {
                    display_path: row.get(1)?,
                    file_size: row.get(2)?,
                    modified_at_ns: row.get(3)?,
                    version: row.get(4)?,
                    fonts_json: row.get(5)?,
                },
            ))
        })?;
        Ok(rows.collect::<Result<HashMap<_, _>, _>>()?)
    }
}

/// Windows 路径不区分大小写，统一小写作为缓存键
fn location_key(path: &Path) -> String {
    path.to_string_lossy().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::{FontCache, FontChanges};
    use crate::persistence::Database;

    #[test]
    fn reconcile_counts_added_modified_and_removed_files() {
        let dir = std::env::temp_dir().join(format!("fontscape-cache-test-{}", std::process::id()));
        let fonts = dir.join("fonts");
        std::fs::create_dir_all(&fonts).unwrap();
        // 无法解析的文件同样写入缓存（结果为空），足以验证变化计数
        std::fs::write(fonts.join("a.ttf"), b"a").unwrap();
        std::fs::write(fonts.join("b.otf"), b"b").unwrap();
        std::fs::write(fonts.join("notes.txt"), b"x").unwrap();

        let database = Database::initialize(dir.join("fontscape.db")).unwrap();
        let cache = FontCache::new(database, vec![fonts.clone()]);
        assert!(cache.load().unwrap().is_none());

        let (_, changes) = cache.reconcile(false).unwrap();
        assert_eq!(changes, FontChanges { added: 2, modified: 0, removed: 0 });
        assert!(cache.reconcile(false).unwrap().1.is_empty());
        assert!(cache.load().unwrap().is_some());

        std::fs::write(fonts.join("a.ttf"), b"changed").unwrap();
        std::fs::remove_file(fonts.join("b.otf")).unwrap();
        std::fs::write(fonts.join("c.ttc"), b"c").unwrap();
        let (_, changes) = cache.reconcile(false).unwrap();
        assert_eq!(changes, FontChanges { added: 1, modified: 1, removed: 1 });

        assert_eq!(cache.reconcile(true).unwrap().1.modified, 2);
        let _ = std::fs::remove_dir_all(dir);
    }
}
