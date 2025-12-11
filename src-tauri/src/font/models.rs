use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontInfo {
    pub id: String,
    pub family: String,
    pub full_name: String,
    pub postscript_name: String,
    pub style: String,
    pub path: String,
    pub file_size: u64,
    pub format: FontFormat,
    pub is_variable: bool,
    pub languages: Vec<String>,
    pub scripts: Vec<String>,
    pub metadata: FontMetadata,
    pub status: FontStatus,
    pub created_at: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum FontFormat {
    TrueType,
    OpenType,
    TrueTypeCollection,
    Woff,
    Woff2,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FontStatus {
    Enabled,
    Disabled,
    SystemFont,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontMetadata {
    pub version: Option<String>,
    pub designer: Option<String>,
    pub manufacturer: Option<String>,
    pub license: Option<String>,
    pub copyright: Option<String>,
    pub description: Option<String>,
}

impl Default for FontMetadata {
    fn default() -> Self {
        Self {
            version: None,
            designer: None,
            manufacturer: None,
            license: None,
            copyright: None,
            description: None,
        }
    }
}
