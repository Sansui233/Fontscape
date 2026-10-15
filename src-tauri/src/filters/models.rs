use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct FilterCriteria {
    pub languages: Vec<String>,
    pub categories: Vec<String>,
    /// 字体名称（含各语言本地化名）包含该文字，不区分大小写；空字符串表示不限
    #[serde(default)]
    pub name_contains: String,
    /// 字体标签包含该文字；标签系统上线前不会匹配任何字体
    #[serde(default)]
    pub tag_contains: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FilterGroup {
    Language,
    Saved,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SavedFilter {
    pub id: String,
    pub name: String,
    pub group_name: FilterGroup,
    pub criteria: FilterCriteria,
    /// 所在文件夹；None 表示位于「已存筛选」根目录。语言预设始终为 None
    pub folder_id: Option<String>,
    pub sort_order: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

/// 「已存筛选」中的文件夹，可无限嵌套
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FilterFolder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub sort_order: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreateFilterInput {
    pub name: String,
    pub criteria: FilterCriteria,
    #[serde(default)]
    pub folder_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UpdateFilterInput {
    pub id: String,
    pub name: String,
    pub criteria: FilterCriteria,
    #[serde(default)]
    pub folder_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreateFolderInput {
    pub name: String,
    #[serde(default)]
    pub parent_id: Option<String>,
}

/// 删除文件夹时如何处理其中的内容
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeleteFolderMode {
    /// 连同所有子文件夹与筛选一起删除
    DeleteContents,
    /// 只删除文件夹，内容移到上一级
    MoveContentsUp,
}
