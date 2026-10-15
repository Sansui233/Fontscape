use crate::filters::FilterCriteria;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PersistedUiState {
    pub active_filter_id: Option<String>,
    pub active_filter_criteria: FilterCriteria,
    pub sidebar_collapsed: bool,
    pub view_mode: String,
}

impl Default for PersistedUiState {
    fn default() -> Self {
        Self {
            active_filter_id: None,
            active_filter_criteria: FilterCriteria::default(),
            sidebar_collapsed: false,
            view_mode: "grid".to_string(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UserPreferences {
    pub preview_size: u16,
    pub preview_text: String,
    pub detail_preview_font_size: u16,
    pub detail_preview_font_weight: u16,
    pub detail_preview_italic: bool,
    pub right_sidebar_width: u16,
    pub language: String,
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            preview_size: 24,
            preview_text: String::new(),
            detail_preview_font_size: 24,
            detail_preview_font_weight: 400,
            detail_preview_italic: false,
            right_sidebar_width: 320,
            language: "zh-CN".to_string(),
        }
    }
}
