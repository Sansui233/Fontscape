use crate::filters::FilterCriteria;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ViewMode {
    #[default]
    Grid,
    List,
}

/// 外观：跟随系统 / 日间 / 夜间
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

/// 字体名称显示：按界面语言显示本地化名，或总是显示英文名
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FontNameMode {
    #[default]
    Localized,
    English,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct PersistedUiState {
    pub active_filter_id: Option<String>,
    pub active_filter_criteria: FilterCriteria,
    pub sidebar_collapsed: bool,
    pub view_mode: ViewMode,
}

impl Default for PersistedUiState {
    fn default() -> Self {
        Self {
            active_filter_id: None,
            active_filter_criteria: FilterCriteria::default(),
            sidebar_collapsed: false,
            view_mode: ViewMode::Grid,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct UserPreferences {
    pub preview_text: String,
    pub detail_preview_font_size: u16,
    pub detail_preview_font_weight: u16,
    pub detail_preview_italic: bool,
    pub right_sidebar_width: u16,
    /// 界面语言：system / en / zh-CN / ja / ko
    pub language: String,
    pub font_names: FontNameMode,
    pub theme: Theme,
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            preview_text: String::new(),
            detail_preview_font_size: 24,
            detail_preview_font_weight: 400,
            detail_preview_italic: false,
            right_sidebar_width: 320,
            language: "system".to_string(),
            font_names: FontNameMode::Localized,
            theme: Theme::System,
        }
    }
}
