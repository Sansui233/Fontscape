use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct FilterCriteria {
    pub languages: Vec<String>,
    pub categories: Vec<String>,
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
    pub sort_order: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreateFilterInput {
    pub name: String,
    pub criteria: FilterCriteria,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UpdateFilterInput {
    pub id: String,
    pub name: String,
    pub criteria: FilterCriteria,
}
