use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontInfo {
    pub id: String,              // 由 path + family + style 的 MD5 哈希生成
    pub family: String,          // OpenType Name ID 1 (FAMILY)，优先英文 (0x0409)
    pub full_name: String,       // OpenType Name ID 4 (FULL_NAME)，优先英文
    pub postscript_name: String, // OpenType Name ID 6 (POST_SCRIPT_NAME)
    pub style: String,           // OpenType Name ID 2 (SUBFAMILY)，默认 "Regular"
    pub path: String,            // 字体文件路径
    pub file_size: u64,          // 由 fs::metadata 获取
    pub format: FontFormat,      // 由文件扩展名判定 (.ttf/.otf/.ttc)
    pub is_variable: bool,       // 由 ttf_parser::Face::is_variable() 判定
    pub weight: u16,             // 字重值 (100-900)，由 OS/2 usWeightClass 或 fvar wght 轴获取
    pub languages: Vec<String>,  // 由 Glyph 覆盖范围判定 (检测特定字符是否存在)
    pub scripts: Vec<String>,    // 由 Glyph 覆盖范围判定 (Latn/Hans/Jpan/Kore/Cyrl/Arab)
    pub metadata: FontMetadata,  // OpenType Name Table 完整信息 (ID 0-20)
    pub status: FontStatus,      // 由 is_system_font() 判定系统字体，否则默认 Enabled
    pub created_at: i64,         // 扫描时的 Unix 时间戳
    // Localized names - 中文本地化名称
    pub family_zh: Option<String>,    // OpenType Name ID 1，language_id: 0x0804/0x1004/0x0404 (简体/新加坡/繁体)
    pub full_name_zh: Option<String>, // OpenType Name ID 4，language_id: 0x0804/0x1004/0x0404
    // CSS font-family 名称 - 浏览器匹配优先级: ID 16 > ID 1 > ID 21
    pub css_font_family: String,      // 优先 Name ID 16 (Typographic Family)，回退到 ID 1 (Family)
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
