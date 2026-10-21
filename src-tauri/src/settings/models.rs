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

/// Grid 卡片：极简只显示预览和名称；详细显示底色预览和可选元数据
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GridCardMode {
    Minimal,
    #[default]
    Detailed,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextAlign {
    #[default]
    Left,
    Center,
    Right,
}

/// Grid 视图专属的显示选项
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct GridPreferences {
    pub card_mode: GridCardMode,
    /// 预览文字的对齐（两种模式共用）
    pub preview_align: TextAlign,
    /// 极简模式下名称的对齐
    pub name_align: TextAlign,
    /// 详细模式下各项元数据是否显示
    pub show_styles: bool,
    pub show_category: bool,
    pub show_format: bool,
    pub show_languages: bool,
}

impl Default for GridPreferences {
    fn default() -> Self {
        Self {
            card_mode: GridCardMode::Detailed,
            preview_align: TextAlign::Left,
            name_align: TextAlign::Left,
            show_styles: true,
            show_category: true,
            show_format: true,
            show_languages: true,
        }
    }
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
    pub grid: GridPreferences,
    /// 字体目录静默多少秒后才检查变化
    pub font_watch_delay_secs: u16,
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
            grid: GridPreferences::default(),
            font_watch_delay_secs: 5,
        }
    }
}
