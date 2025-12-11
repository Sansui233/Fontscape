use super::models::*;
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;

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

    /// Get user fonts directory
    fn get_user_fonts_dir() -> PathBuf {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            PathBuf::from(local_app_data).join("Microsoft\\Windows\\Fonts")
        } else {
            PathBuf::from("C:\\Users\\Public\\Fonts")
        }
    }

    /// Scan all fonts in the system
    pub fn scan_all_fonts(&self) -> Result<Vec<FontInfo>, String> {
        let mut fonts = Vec::new();
        let mut errors = Vec::new();

        println!("Starting font scan...");

        for dir in &self.font_dirs {
            println!("Scanning directory: {:?}", dir);

            if !dir.exists() {
                println!("Directory does not exist: {:?}", dir);
                continue;
            }

            match fs::read_dir(dir) {
                Ok(entries) => {
                    for entry in entries {
                        match entry {
                            Ok(entry) => {
                                let path = entry.path();

                                if !path.is_file() {
                                    continue;
                                }

                                if Self::is_font_file(&path) {
                                    match self.parse_font(&path) {
                                        Ok(font_list) => {
                                            fonts.extend(font_list);
                                        }
                                        Err(e) => {
                                            errors.push(format!("{:?}: {}", path, e));
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                errors.push(format!("Failed to read entry: {}", e));
                            }
                        }
                    }
                }
                Err(e) => {
                    println!("Failed to read directory {:?}: {}", dir, e);
                }
            }
        }

        println!("Scan complete. Found {} fonts", fonts.len());
        if !errors.is_empty() {
            println!("Encountered {} errors during scan", errors.len());
            for (i, error) in errors.iter().take(10).enumerate() {
                println!("  Error {}: {}", i + 1, error);
            }
        }

        Ok(fonts)
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
    fn parse_font(&self, path: &PathBuf) -> Result<Vec<FontInfo>, String> {
        let data = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;
        let metadata = fs::metadata(path).map_err(|e| format!("Failed to get metadata: {}", e))?;

        let mut fonts = Vec::new();

        // Determine format
        let format = match path.extension().and_then(|e| e.to_str()) {
            Some("ttf") => FontFormat::TrueType,
            Some("otf") => FontFormat::OpenType,
            Some("ttc") => FontFormat::TrueTypeCollection,
            _ => FontFormat::TrueType,
        };

        // TTC files can contain multiple fonts
        let face_count = if format == FontFormat::TrueTypeCollection {
            // Try to determine number of faces in collection
            ttf_parser::fonts_in_collection(&data).unwrap_or(1)
        } else {
            1
        };

        for face_index in 0..face_count {
            match ttf_parser::Face::parse(&data, face_index) {
                Ok(face) => {
                    match self.create_font_info(&face, path, &metadata, format.clone()) {
                        Ok(font_info) => {
                            fonts.push(font_info);
                        }
                        Err(e) => {
                            println!("Failed to create font info for {:?} face {}: {}", path, face_index, e);
                        }
                    }
                }
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
        let postscript_name = Self::extract_name_with_fallback(face, ttf_parser::name_id::POST_SCRIPT_NAME);
        let style = Self::extract_name(face, ttf_parser::name_id::SUBFAMILY)
            .unwrap_or_else(|| "Regular".to_string());

        // Extract Chinese (PRC) localized names - language_id = 0x0804
        let mut family_zh = Self::extract_name_by_language(face, ttf_parser::name_id::FAMILY, 0x0804);
        let mut full_name_zh = Self::extract_name_by_language(face, ttf_parser::name_id::FULL_NAME, 0x0804);
        // If not found try language_id = 0x0c04 (Hong Kong)
        if family_zh.is_none() {
            family_zh = Self::extract_name_by_language(face, ttf_parser::name_id::FAMILY, 0x1004);
            full_name_zh = Self::extract_name_by_language(face, ttf_parser::name_id::FULL_NAME, 0x1004);
        }
        // If still not found, try Taiwan (0x0404)
        if family_zh.is_none() {
            family_zh = Self::extract_name_by_language(face, ttf_parser::name_id::FAMILY, 0x0404);
            full_name_zh = Self::extract_name_by_language(face, ttf_parser::name_id::FULL_NAME, 0x0404);
        }


        // Generate unique ID
        let id_source = format!("{}-{}-{}", path.to_string_lossy(), family, style);
        let id = format!("{:x}", md5::compute(id_source.as_bytes()));

        // Detect languages and scripts
        let (languages, scripts) = Self::detect_languages_and_scripts(face);

        // Check if system font
        let status = if Self::is_system_font(&family) {
            FontStatus::SystemFont
        } else {
            FontStatus::Enabled
        };

        // Extract metadata
        let font_metadata = Self::extract_metadata(face);

        
        Ok(FontInfo {
            id,
            family,
            full_name,
            postscript_name,
            style,
            path: path.to_string_lossy().to_string(),
            file_size: metadata.len(),
            format,
            is_variable: face.is_variable(),
            languages,
            scripts,
            metadata: font_metadata,
            status,
            created_at: SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64,
            family_zh,
            full_name_zh
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
    fn extract_name_by_language(face: &ttf_parser::Face, name_id: u16, language_id: u16) -> Option<String> {
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
            copyright: Self::extract_name(face, ttf_parser::name_id::COPYRIGHT_NOTICE),         // 0
            family_name: Self::extract_name(face, ttf_parser::name_id::FAMILY),                 // 1
            subfamily_name: Self::extract_name(face, ttf_parser::name_id::SUBFAMILY),           // 2
            unique_identifier: Self::extract_name(face, ttf_parser::name_id::UNIQUE_ID),        // 3
            full_name: Self::extract_name(face, ttf_parser::name_id::FULL_NAME),                // 4
            version: Self::extract_name(face, ttf_parser::name_id::VERSION),                    // 5
            postscript_name: Self::extract_name(face, ttf_parser::name_id::POST_SCRIPT_NAME),   // 6
            trademark: Self::extract_name(face, ttf_parser::name_id::TRADEMARK),                // 7
            manufacturer: Self::extract_name(face, ttf_parser::name_id::MANUFACTURER),          // 8
            designer: Self::extract_name(face, ttf_parser::name_id::DESIGNER),                  // 9
            description: Self::extract_name(face, ttf_parser::name_id::DESCRIPTION),            // 10
            vendor_url: Self::extract_name(face, ttf_parser::name_id::VENDOR_URL),              // 11
            designer_url: Self::extract_name(face, ttf_parser::name_id::DESIGNER_URL),          // 12
            license: Self::extract_name(face, ttf_parser::name_id::LICENSE),                    // 13
            license_url: Self::extract_name(face, ttf_parser::name_id::LICENSE_URL),            // 14

            // Extended Name IDs (16-20) - May not be present in all fonts
            typographic_family: Self::extract_name(face, 16),                                   // 16 - Preferred Family
            typographic_subfamily: Self::extract_name(face, 17),                                // 17 - Preferred Subfamily
            compatible_full: Self::extract_name(face, 18),                                      // 18 - Compatible Full Name
            sample_text: Self::extract_name(face, 19),                                          // 19 - Sample Text
            postscript_cid: Self::extract_name(face, 20),                                       // 20 - PostScript CID
        }
    }

    /// Detect supported languages and scripts by checking character coverage
    fn detect_languages_and_scripts(face: &ttf_parser::Face) -> (Vec<String>, Vec<String>) {
        let mut languages = Vec::new();
        let mut scripts = Vec::new();

        // Check for Latin characters (English)
        // Use common Latin letters
        if face.glyph_index('A').is_some() && face.glyph_index('a').is_some() {
            languages.push("English".to_string());
            scripts.push("Latn".to_string());
        }

        // Check for Chinese characters (Simplified Chinese)
        // Use characters that are unique to Chinese
        // "觉" (jue) - common simplified Chinese character
        if face.glyph_index('觉').is_some() {
            languages.push("Chinese".to_string());
            scripts.push("Hans".to_string());
        }

        // Check for Japanese characters
        // "あ" - first hiragana character
        if face.glyph_index('あ').is_some() {
            languages.push("Japanese".to_string());
            scripts.push("Jpan".to_string());
        }

        // Check for Korean characters
        // "가" - first Hangul syllable
        if face.glyph_index('가').is_some() {
            languages.push("Korean".to_string());
            scripts.push("Kore".to_string());
        }

        // Check for Cyrillic (Russian)
        // "А" - Cyrillic capital A
        // "Я" - Cyrillic Ya
        if face.glyph_index('А').is_some() && face.glyph_index('я').is_some() {
            languages.push("Russian".to_string());
            scripts.push("Cyrl".to_string());
        }

        // Check for Arabic
        // "ا" - Arabic letter Alef
        if face.glyph_index('ا').is_some() {
            languages.push("Arabic".to_string());
            scripts.push("Arab".to_string());
        }

        // If no languages detected at all, mark as Unknown
        if languages.is_empty() {
            languages.push("Unknown".to_string());
            scripts.push("Unknown".to_string());
        }

        (languages, scripts)
    }

    /// Check if font is a system critical font
    fn is_system_font(family: &str) -> bool {
        const SYSTEM_FONTS: &[&str] = &[
            "Segoe UI",
            "Microsoft YaHei",
            "SimSun",
            "Tahoma",
        ];

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
