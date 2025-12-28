use super::models::{CssFontFamily, FontInfo};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// FontState - stores scanned fonts and aggregated CSS font family data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontState {
    pub fonts: Vec<FontInfo>,
    pub css_font_families: Vec<CssFontFamily>,
}

impl FontState {
    /// Create a new FontState from a list of FontInfo
    /// Automatically aggregates CSS font families and determines default fonts
    pub fn new(fonts: Vec<FontInfo>) -> Self {
        let css_font_families = Self::aggregate_css_font_families(&fonts);
        Self {
            fonts,
            css_font_families,
        }
    }

    /// Aggregate fonts by css_font_family name and determine default font for each family
    /// Default font is the one with weight closest to 400
    fn aggregate_css_font_families(fonts: &[FontInfo]) -> Vec<CssFontFamily> {
        // Group fonts by css_font_family name
        let mut family_map: HashMap<String, Vec<&FontInfo>> = HashMap::new();

        for font in fonts {
            family_map
                .entry(font.css_font_family.clone())
                .or_default()
                .push(font);
        }

        // Create CssFontFamily for each group
        let mut css_font_families: Vec<CssFontFamily> = family_map
            .into_iter()
            .map(|(name, font_list)| {
                let font_count = font_list.len();
                let default_font_id = Self::find_default_font(&font_list);

                CssFontFamily {
                    name,
                    font_count,
                    default_font_id,
                }
            })
            .collect();

        // Sort by name for consistent ordering
        css_font_families.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        css_font_families
    }

    /// Find the default font ID (weight closest to 400)
    fn find_default_font(fonts: &[&FontInfo]) -> String {
        fonts
            .iter()
            .min_by_key(|font| {
                // Calculate distance from 400
                // Use absolute difference
                (font.weight as i32 - 400).unsigned_abs()
            })
            .map(|font| font.id.clone())
            .unwrap_or_default()
    }

    /// Get font by ID
    pub fn get_font(&self, id: &str) -> Option<&FontInfo> {
        self.fonts.iter().find(|f| f.id == id)
    }

    /// Get CSS font family by name
    pub fn get_css_font_family(&self, name: &str) -> Option<&CssFontFamily> {
        self.css_font_families.iter().find(|f| f.name == name)
    }

    /// Get all fonts belonging to a CSS font family
    pub fn get_fonts_by_css_family(&self, family_name: &str) -> Vec<&FontInfo> {
        self.fonts
            .iter()
            .filter(|f| f.css_font_family == family_name)
            .collect()
    }

    /// Get total font count
    pub fn font_count(&self) -> usize {
        self.fonts.len()
    }

    /// Get CSS font family count
    pub fn css_font_family_count(&self) -> usize {
        self.css_font_families.len()
    }
}

impl Default for FontState {
    fn default() -> Self {
        Self {
            fonts: Vec::new(),
            css_font_families: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::font::models::{FontFormat, FontMetadata, FontStatus};

    fn create_test_font(id: &str, css_font_family: &str, weight: u16) -> FontInfo {
        FontInfo {
            id: id.to_string(),
            family: css_font_family.to_string(),
            full_name: format!("{} {}", css_font_family, weight),
            postscript_name: format!("{}-{}", css_font_family, weight),
            style: "Regular".to_string(),
            path: "/test/path".to_string(),
            file_size: 1000,
            format: FontFormat::TrueType,
            is_variable: false,
            weight,
            languages: vec!["English".to_string()],
            scripts: vec!["Latn".to_string()],
            metadata: FontMetadata::default(),
            status: FontStatus::Enabled,
            created_at: 0,
            family_zh: None,
            full_name_zh: None,
            css_font_family: css_font_family.to_string(),
        }
    }

    #[test]
    fn test_aggregate_css_font_families() {
        let fonts = vec![
            create_test_font("1", "Roboto", 400),
            create_test_font("2", "Roboto", 700),
            create_test_font("3", "Roboto", 300),
            create_test_font("4", "Open Sans", 400),
            create_test_font("5", "Open Sans", 600),
        ];

        let state = FontState::new(fonts);

        assert_eq!(state.css_font_family_count(), 2);
        assert_eq!(state.font_count(), 5);

        // Check Roboto family
        let roboto = state.get_css_font_family("Roboto").unwrap();
        assert_eq!(roboto.font_count, 3);
        assert_eq!(roboto.default_font_id, "1"); // weight 400 is closest to 400

        // Check Open Sans family
        let open_sans = state.get_css_font_family("Open Sans").unwrap();
        assert_eq!(open_sans.font_count, 2);
        assert_eq!(open_sans.default_font_id, "4"); // weight 400 is closest to 400
    }

    #[test]
    fn test_default_font_selection_closest_to_400() {
        // Test when 400 is not available, should pick closest
        let fonts = vec![
            create_test_font("1", "TestFont", 300),
            create_test_font("2", "TestFont", 500),
            create_test_font("3", "TestFont", 700),
        ];

        let state = FontState::new(fonts);
        let family = state.get_css_font_family("TestFont").unwrap();

        // 300 is 100 away, 500 is 100 away - both are equal distance
        // Since 300 comes first in iteration, it might win, but let's check
        // Actually, min_by_key will return first minimum, so 300 should win
        assert!(family.default_font_id == "1" || family.default_font_id == "2");
    }

    #[test]
    fn test_get_fonts_by_css_family() {
        let fonts = vec![
            create_test_font("1", "Roboto", 400),
            create_test_font("2", "Roboto", 700),
            create_test_font("3", "Open Sans", 400),
        ];

        let state = FontState::new(fonts);
        let roboto_fonts = state.get_fonts_by_css_family("Roboto");

        assert_eq!(roboto_fonts.len(), 2);
    }
}
