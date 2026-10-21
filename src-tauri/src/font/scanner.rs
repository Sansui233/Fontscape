use super::classifier;
use super::models::*;
use super::state::FontState;
use rayon::prelude::*;
use std::collections::BTreeMap;
use std::fs;
use memmap2::Mmap;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// 内存映射字体文件。ttf-parser 只访问用到的表（name、OS/2、cmap 等），
/// 操作系统也只读取对应的页，避免把整个文件（CJK 字体常达数十至上百 MB）读入内存。
pub(crate) fn map_font_file(path: &Path) -> Result<Mmap, String> {
    let file = fs::File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    // SAFETY: 映射只在解析期间短暂持有；映射期间 Windows 不允许截断或删除该文件
    unsafe { Mmap::map(&file) }.map_err(|e| format!("Failed to map file: {}", e))
}

/// 解析逻辑版本。FontInfo 字段或提取规则变化时递增，缓存据此整体重新解析。
pub const PARSER_SCHEMA_VERSION: u32 = 1;

/// 目录中的一个字体文件及其用于判断变化的属性
#[derive(Debug, Clone)]
pub struct FontFile {
    pub path: PathBuf,
    pub file_size: u64,
    pub modified_at_ns: i64,
}

pub struct FontScanner {
    font_dirs: Vec<PathBuf>,
}

impl FontScanner {
    pub fn new() -> Self {
        Self {
            font_dirs: vec![
                PathBuf::from("C:\\Windows\\Fonts"),
                // Also scan user fonts directory
                Self::get_user_fonts_dir(),
            ],
        }
    }

    pub fn with_dirs(font_dirs: Vec<PathBuf>) -> Self {
        Self { font_dirs }
    }

    /// 扫描的字体目录（系统 + 当前用户）
    pub fn font_dirs(&self) -> &[PathBuf] {
        &self.font_dirs
    }

    /// Get user fonts directory
    fn get_user_fonts_dir() -> PathBuf {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            PathBuf::from(local_app_data).join("Microsoft\\Windows\\Fonts")
        } else {
            PathBuf::from("C:\\Users\\Public\\Fonts")
        }
    }

    /// 列出所有字体目录中的字体文件。不存在的目录视为空；读取失败的目录单独返回，
    /// 调用方不能据此认定其中的文件已删除。
    pub fn list_font_files(&self) -> (Vec<FontFile>, Vec<PathBuf>) {
        let mut files = Vec::new();
        let mut failed_dirs = Vec::new();

        for dir in &self.font_dirs {
            if !dir.exists() {
                continue;
            }
            match fs::read_dir(dir) {
                Ok(entries) => files.extend(entries.filter_map(|entry| {
                    let entry = entry.ok()?;
                    let path = entry.path();
                    // Windows 上 DirEntry::metadata 来自目录枚举结果，不额外访问文件
                    let metadata = entry.metadata().ok()?;
                    if !metadata.is_file() || !Self::is_font_file(&path) {
                        return None;
                    }
                    let modified_at_ns = metadata
                        .modified()
                        .ok()?
                        .duration_since(SystemTime::UNIX_EPOCH)
                        .ok()?
                        .as_nanos() as i64;
                    Some(FontFile {
                        path,
                        file_size: metadata.len(),
                        modified_at_ns,
                    })
                })),
                Err(e) => {
                    println!("Failed to read directory {:?}: {}", dir, e);
                    failed_dirs.push(dir.clone());
                }
            }
        }

        (files, failed_dirs)
    }

    /// 不经缓存，解析全部字体文件
    pub fn scan_all_fonts(&self) -> Result<FontState, String> {
        let (files, _) = self.list_font_files();
        let fonts = files
            .par_iter()
            .filter_map(|file| self.parse_font(&file.path).ok())
            .flatten()
            .collect();
        Ok(FontState::new(fonts))
    }

    /// Check if file is a font file
    fn is_font_file(path: &PathBuf) -> bool {
        if let Some(ext) = path.extension() {
            matches!(
                ext.to_str().unwrap_or("").to_lowercase().as_str(),
                "ttf" | "otf" | "ttc"
            )
        } else {
            false
        }
    }

    /// Parse a single font file (returns Vec because TTC files contain multiple fonts)
    pub(crate) fn parse_font(&self, path: &PathBuf) -> Result<Vec<FontInfo>, String> {
        let data = map_font_file(path)?;
        let metadata = fs::metadata(path).map_err(|e| format!("Failed to get metadata: {}", e))?;

        let mut fonts = Vec::new();

        // Determine format
        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        let format = match extension.as_str() {
            "otf" => FontFormat::OpenType,
            "ttc" => FontFormat::TrueTypeCollection,
            _ => FontFormat::TrueType,
        };

        // TTC files can contain multiple fonts
        let face_count = if format == FontFormat::TrueTypeCollection {
            // Try to determine number of faces in collection
            ttf_parser::fonts_in_collection(&data[..]).unwrap_or(1)
        } else {
            1
        };

        for face_index in 0..face_count {
            match ttf_parser::Face::parse(&data[..], face_index) {
                Ok(face) => match self.create_font_info(&face, path, &metadata, format.clone()) {
                    Ok(font_info) => {
                        fonts.push(font_info);
                    }
                    Err(e) => {
                        println!(
                            "Failed to create font info for {:?} face {}: {}",
                            path, face_index, e
                        );
                    }
                },
                Err(e) => {
                    if face_index == 0 {
                        // Only report error for the first face
                        return Err(format!("Failed to parse font: {}", e));
                    }
                    break;
                }
            }
        }

        if fonts.is_empty() {
            Err("No fonts could be parsed from file".to_string())
        } else {
            Ok(fonts)
        }
    }

    /// Create FontInfo from parsed face
    fn create_font_info(
        &self,
        face: &ttf_parser::Face,
        path: &PathBuf,
        metadata: &std::fs::Metadata,
        format: FontFormat,
    ) -> Result<FontInfo, String> {
        // Extract font names with fallbacks (English)
        let family = Self::extract_name_with_fallback(face, ttf_parser::name_id::FAMILY);
        let full_name = Self::extract_name_with_fallback(face, ttf_parser::name_id::FULL_NAME);
        let postscript_name =
            Self::extract_name_with_fallback(face, ttf_parser::name_id::POST_SCRIPT_NAME);
        let style = Self::extract_name(face, ttf_parser::name_id::SUBFAMILY)
            .unwrap_or_else(|| "Regular".to_string());

        // 本地化名称：每种语言按 Windows language_id 优先级查找第一个存在的记录
        let localized_names = Self::extract_localized_names(face);
        let zh = localized_names
            .get("zh-Hans")
            .or_else(|| localized_names.get("zh-Hant"));
        let family_zh = zh.map(|name| name.family.clone());
        let full_name_zh = zh.and_then(|name| name.full_name.clone());

        // Generate unique ID
        let id_source = format!("{}-{}-{}", path.to_string_lossy(), family, style);
        let id = format!("{:x}", md5::compute(id_source.as_bytes()));

        // Detect languages and scripts
        let (charsets, languages, scripts) = Self::detect_charsets_and_languages(face);

        // Check if system font
        let status = if Self::is_system_font(&family) {
            FontStatus::SystemFont
        } else {
            FontStatus::Enabled
        };

        // Extract metadata
        let font_metadata = Self::extract_metadata(face);

        // Extract CSS font-family name (priority: ID 16 > ID 1 > ID 21)
        let css_font_family = Self::extract_css_font_family(face);

        // Extract font weight (priority: fvar wght axis for variable fonts > OS/2 usWeightClass)
        let weight = Self::extract_weight(face);

        let mut category_names = vec![family.as_str(), css_font_family.as_str()];
        category_names.extend(family_zh.as_deref());
        let category = classifier::classify(face, &category_names);

        Ok(FontInfo {
            id,
            family,
            full_name,
            postscript_name,
            style,
            category: Some(category),
            path: path.to_string_lossy().to_string(),
            file_size: metadata.len(),
            format,
            is_variable: face.is_variable(),
            weight,
            charsets,
            languages,
            scripts,
            metadata: font_metadata,
            status,
            created_at: SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64,
            family_zh,
            full_name_zh,
            localized_names,
            css_font_family,
        })
    }

    /// Extract name from font with multiple attempts
    /// name_id: OpenType Name ID
    /// see https://docs.rs/ttf-parser/latest/ttf_parser/name/struct.Name.html
    fn extract_name(face: &ttf_parser::Face, ot_name_id: u16) -> Option<String> {
        // Priority order: English, then any Unicode
        let mut fallback = None;

        for face_name in face.names() {
            if face_name.name_id == ot_name_id {
                if face_name.is_unicode() {
                    if let Some(s) = face_name.to_string() {
                        // Prefer English (language_id == 0x0409)
                        if face_name.language_id == 0x0409 {
                            return Some(s);
                        }
                        // Store first Unicode name as fallback
                        if fallback.is_none() {
                            fallback = Some(s.clone());
                        }
                    }
                }
            }
        }

        fallback
    }

    /// Extract ot name for specific language
    fn extract_name_by_language(
        face: &ttf_parser::Face,
        name_id: u16,
        language_id: u16,
    ) -> Option<String> {
        for name in face.names() {
            if name.name_id == name_id && name.language_id == language_id {
                if name.is_unicode() {
                    if let Some(s) = name.to_string() {
                        return Some(s);
                    }
                }
            }
        }
        None
    }

    /// 各语言对应的 Windows language_id，按优先级排列
    const LOCALIZED_LANGUAGE_IDS: &'static [(&'static str, &'static [u16])] = &[
        ("zh-Hans", &[0x0804, 0x1004]),         // 中国大陆、新加坡
        ("zh-Hant", &[0x0404, 0x0C04, 0x1404]), // 台湾、香港、澳门
        ("ja", &[0x0411]),
        ("ko", &[0x0412]),
    ];

    fn extract_localized_names(face: &ttf_parser::Face) -> BTreeMap<String, LocalizedName> {
        let mut names = BTreeMap::new();
        for (language, ids) in Self::LOCALIZED_LANGUAGE_IDS {
            let found = ids.iter().find_map(|&id| {
                Self::extract_name_by_language(face, ttf_parser::name_id::FAMILY, id).map(|family| {
                    LocalizedName {
                        family,
                        full_name: Self::extract_name_by_language(face, ttf_parser::name_id::FULL_NAME, id),
                    }
                })
            });
            if let Some(name) = found {
                names.insert(language.to_string(), name);
            }
        }
        names
    }

    /// Extract name with fallback to family name
    fn extract_name_with_fallback(face: &ttf_parser::Face, name_id: u16) -> String {
        Self::extract_name(face, name_id).unwrap_or_else(|| {
            // Fallback to family name, or "Unknown"
            if name_id != ttf_parser::name_id::FAMILY {
                Self::extract_name(face, ttf_parser::name_id::FAMILY)
                    .unwrap_or_else(|| "Unknown".to_string())
            } else {
                "Unknown".to_string()
            }
        })
    }

    /// Extract CSS font-family name with browser matching priority
    /// Priority: Name ID 16 (Typographic Family) > Name ID 1 (Family) > Name ID 21 (WWS Family)
    fn extract_css_font_family(face: &ttf_parser::Face) -> String {
        // 1. Try Name ID 16 (Typographic Family / Preferred Family) - highest priority
        if let Some(name) = Self::extract_name(face, 16) {
            return name;
        }
        // 2. Fallback to Name ID 1 (Font Family Name) - standard
        if let Some(name) = Self::extract_name(face, ttf_parser::name_id::FAMILY) {
            return name;
        }
        // 3. Try Name ID 21 (WWS Family Name) - rarely used
        if let Some(name) = Self::extract_name(face, 21) {
            return name;
        }
        // 4. Final fallback
        "Unknown".to_string()
    }

    /// Extract font weight with Chrome matching priority
    /// Priority: fvar wght axis (variable fonts) > OS/2 usWeightClass > fallback 400
    fn extract_weight(face: &ttf_parser::Face) -> u16 {
        // 1. For variable fonts, try fvar table wght axis default value
        if face.is_variable() {
            for axis in face.variation_axes() {
                // wght axis tag ('wght')
                if axis.tag.to_bytes() == [b'w', b'g', b'h', b't'] {
                    return axis.def_value as u16;
                }
            }
        }

        // 2. For static fonts, use face.weight() which reads OS/2 usWeightClass
        face.weight().to_number()
    }

    /// Extract font metadata from OpenType/TrueType naming table
    ///
    /// This function extracts standardized OpenType Name IDs (0-20+).
    /// Supports:
    /// - TrueType (.ttf): Full naming table support
    /// - OpenType (.otf): Full naming table support
    /// - TrueType Collection (.ttc): Per-face naming table
    ///
    /// Note: Both TrueType and OpenType fonts use the same naming table format,
    /// so metadata extraction is uniform across these formats.
    fn extract_metadata(face: &ttf_parser::Face) -> FontMetadata {
        FontMetadata {
            // Standard Name IDs (0-14) - Available in most fonts
            copyright: Self::extract_name(face, ttf_parser::name_id::COPYRIGHT_NOTICE), // 0
            family_name: Self::extract_name(face, ttf_parser::name_id::FAMILY),         // 1
            subfamily_name: Self::extract_name(face, ttf_parser::name_id::SUBFAMILY),   // 2
            unique_identifier: Self::extract_name(face, ttf_parser::name_id::UNIQUE_ID), // 3
            full_name: Self::extract_name(face, ttf_parser::name_id::FULL_NAME),        // 4
            version: Self::extract_name(face, ttf_parser::name_id::VERSION),            // 5
            postscript_name: Self::extract_name(face, ttf_parser::name_id::POST_SCRIPT_NAME), // 6
            trademark: Self::extract_name(face, ttf_parser::name_id::TRADEMARK),        // 7
            manufacturer: Self::extract_name(face, ttf_parser::name_id::MANUFACTURER),  // 8
            designer: Self::extract_name(face, ttf_parser::name_id::DESIGNER),          // 9
            description: Self::extract_name(face, ttf_parser::name_id::DESCRIPTION),    // 10
            vendor_url: Self::extract_name(face, ttf_parser::name_id::VENDOR_URL),      // 11
            designer_url: Self::extract_name(face, ttf_parser::name_id::DESIGNER_URL),  // 12
            license: Self::extract_name(face, ttf_parser::name_id::LICENSE),            // 13
            license_url: Self::extract_name(face, ttf_parser::name_id::LICENSE_URL),    // 14

            // Extended Name IDs (16-20) - May not be present in all fonts
            typographic_family: Self::extract_name(face, 16), // 16 - Preferred Family
            typographic_subfamily: Self::extract_name(face, 17), // 17 - Preferred Subfamily
            compatible_full: Self::extract_name(face, 18),    // 18 - Compatible Full Name
            sample_text: Self::extract_name(face, 19),        // 19 - Sample Text
            postscript_cid: Self::extract_name(face, 20),     // 20 - PostScript CID
        }
    }

    /// Detect supported languages and scripts by checking character coverage
    /// Detect charsets and calculate languages
    /// Returns: (charsets, languages, scripts)
    fn detect_charsets_and_languages(
        face: &ttf_parser::Face,
    ) -> (Vec<String>, Vec<String>, Vec<String>) {
        let mut charsets = Vec::new();
        let mut scripts = Vec::new();

        // Check for Latin characters
        if face.glyph_index('A').is_some() && face.glyph_index('a').is_some() {
            charsets.push("Latn".to_string());
            scripts.push("Latn".to_string());
        }

        // Check for Chinese Simplified (Hans)
        // '觉' is simplified Chinese character
        if face.glyph_index('觉').is_some()
            && face.glyph_index('天').is_some()
            && face.glyph_index('黄').is_some()
            && face.glyph_index('龙').is_some()
        {
            charsets.push("Hans".to_string());
            scripts.push("Hans".to_string());
        }

        // Check for Chinese Traditional (Hant)
        // '獨' is traditional Chinese character (simplified: 独)
        if face.glyph_index('獨').is_some()
            && face.glyph_index('聲').is_some()
            && face.glyph_index('壞').is_some()
        {
            charsets.push("Hant".to_string());
            scripts.push("Hant".to_string());
        }

        // Check for Japanese
        // 'あ' - hiragana, '発' - shinjitai (new Japanese character)
        // Both must exist for complete Japanese charset
        if face.glyph_index('あ').is_some() && face.glyph_index('壊').is_some() {
            charsets.push("Jpan".to_string());
            scripts.push("Jpan".to_string());
        }

        // Check for Korean
        // '가' - Hangul
        if face.glyph_index('가').is_some() {
            charsets.push("Kore".to_string());
            scripts.push("Kore".to_string());
        }

        // Check for Cyrillic (Russian)
        if face.glyph_index('А').is_some() && face.glyph_index('я').is_some() {
            charsets.push("Cyrl".to_string());
            scripts.push("Cyrl".to_string());
        }

        // Check for Arabic
        if face.glyph_index('ا').is_some() {
            charsets.push("Arab".to_string());
            scripts.push("Arab".to_string());
        }

        // Calculate languages from charsets
        let languages = Self::calculate_languages(&charsets);

        // If no charsets detected, mark as Unknown
        if charsets.is_empty() {
            charsets.push("Unknown".to_string());
            scripts.push("Unknown".to_string());
        }

        (charsets, languages, scripts)
    }

    /// Calculate languages from charsets
    fn calculate_languages(charsets: &[String]) -> Vec<String> {
        let mut languages = Vec::new();

        // English: only Latn charset (no CJK)
        let has_latn = charsets.contains(&"Latn".to_string());
        let has_cjk = charsets
            .iter()
            .any(|c| c == "Hans" || c == "Hant" || c == "Jpan" || c == "Kore");
        if has_latn && !has_cjk {
            languages.push("English".to_string());
        }

        // Chinese: has Hans or Hant
        if charsets.contains(&"Hans".to_string()) || charsets.contains(&"Hant".to_string()) {
            languages.push("Chinese".to_string());
        }

        // Japanese: has Jpan
        if charsets.contains(&"Jpan".to_string()) {
            languages.push("Japanese".to_string());
        }

        // Korean: has Kore
        if charsets.contains(&"Kore".to_string()) {
            languages.push("Korean".to_string());
        }

        // Russian: has Cyrl
        if charsets.contains(&"Cyrl".to_string()) {
            languages.push("Russian".to_string());
        }

        // Arabic: has Arab
        if charsets.contains(&"Arab".to_string()) {
            languages.push("Arabic".to_string());
        }

        // If no languages calculated, mark as Unknown
        if languages.is_empty() {
            languages.push("Unknown".to_string());
        }

        languages
    }

    /// Check if font is a system critical font
    fn is_system_font(family: &str) -> bool {
        const SYSTEM_FONTS: &[&str] = &["Segoe UI", "Microsoft YaHei", "SimSun", "Tahoma"];

        SYSTEM_FONTS.iter().any(|&f| family.contains(f))
    }
}

impl Default for FontScanner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Unit test: System font detection logic
    #[test]
    fn test_system_font_detection() {
        assert!(FontScanner::is_system_font("Segoe UI"));
        assert!(FontScanner::is_system_font("Microsoft YaHei"));
        assert!(FontScanner::is_system_font("SimSun"));
        assert!(FontScanner::is_system_font("Tahoma"));
        assert!(!FontScanner::is_system_font("Arial"));
        assert!(!FontScanner::is_system_font("Times New Roman"));
        assert!(!FontScanner::is_system_font("Helvetica"));
    }

    /// Unit test: Font file extension detection
    #[test]
    fn test_is_font_file() {
        use std::path::PathBuf;

        assert!(FontScanner::is_font_file(&PathBuf::from("test.ttf")));
        assert!(FontScanner::is_font_file(&PathBuf::from("test.otf")));
        assert!(FontScanner::is_font_file(&PathBuf::from("test.ttc")));
        assert!(FontScanner::is_font_file(&PathBuf::from("TEST.TTF"))); // Case insensitive
        assert!(!FontScanner::is_font_file(&PathBuf::from("test.txt")));
        assert!(!FontScanner::is_font_file(&PathBuf::from("test.pdf")));
        assert!(!FontScanner::is_font_file(&PathBuf::from("test")));
    }
}
