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
    pub languages: Vec<String>, // 由 Glyph 判定
    pub scripts: Vec<String>,
    pub metadata: FontMetadata, // OpenType Name Table 信息
    pub status: FontStatus,   // Enabled, Disabled, SystemFont
    pub created_at: i64,
    // Localized names
    pub family_zh: Option<String>,      // Chinese (PRC) family name
    pub full_name_zh: Option<String>,   // Chinese (PRC) full name
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
    // OpenType Name IDs
    pub copyright: Option<String>,              // ID 0
    pub family_name: Option<String>,            // ID 1
    pub subfamily_name: Option<String>,         // ID 2
    pub unique_identifier: Option<String>,      // ID 3
    pub full_name: Option<String>,              // ID 4
    pub version: Option<String>,                // ID 5
    pub postscript_name: Option<String>,        // ID 6
    pub trademark: Option<String>,              // ID 7
    pub manufacturer: Option<String>,           // ID 8
    pub designer: Option<String>,               // ID 9
    pub description: Option<String>,            // ID 10
    pub vendor_url: Option<String>,             // ID 11
    pub designer_url: Option<String>,           // ID 12
    pub license: Option<String>,                // ID 13
    pub license_url: Option<String>,            // ID 14
    pub typographic_family: Option<String>,     // ID 16 (Preferred Family)
    pub typographic_subfamily: Option<String>,  // ID 17
    pub compatible_full: Option<String>,        // ID 18
    pub sample_text: Option<String>,            // ID 19
    pub postscript_cid: Option<String>,         // ID 20
}

impl Default for FontMetadata {
    fn default() -> Self {
        Self {
            copyright: None,
            family_name: None,
            subfamily_name: None,
            unique_identifier: None,
            full_name: None,
            version: None,
            postscript_name: None,
            trademark: None,
            manufacturer: None,
            designer: None,
            description: None,
            vendor_url: None,
            designer_url: None,
            license: None,
            license_url: None,
            typographic_family: None,
            typographic_subfamily: None,
            compatible_full: None,
            sample_text: None,
            postscript_cid: None,
        }
    }
}
