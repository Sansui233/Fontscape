use crate::filters::{FilterFolder, SavedFilter};
use crate::font::{classifier, FontState, LANGUAGES};
use crate::settings::{PersistedUiState, UserPreferences};
use crate::tags::{FamilyTag, Tag};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BootstrapPayload {
    pub font_state: FontState,
    pub filters: Vec<SavedFilter>,
    pub folders: Vec<FilterFolder>,
    pub tags: Vec<Tag>,
    pub family_tags: Vec<FamilyTag>,
    pub filter_options: FilterOptions,
    pub ui_state: PersistedUiState,
    pub preferences: UserPreferences,
}

/// 筛选面板的可选值，来自后端固定列表，不随当前结果变化
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterOptions {
    pub languages: Vec<String>,
    pub categories: Vec<String>,
}

impl Default for FilterOptions {
    fn default() -> Self {
        Self {
            languages: LANGUAGES.iter().map(|value| value.to_string()).collect(),
            categories: classifier::CATEGORIES.iter().map(|value| value.to_string()).collect(),
        }
    }
}

/// 保存的 active Filter 已不存在时回到 All Fonts；存在时以数据库中的最新条件为准
pub fn reconcile_ui_state(mut state: PersistedUiState, filters: &[SavedFilter]) -> PersistedUiState {
    if let Some(id) = &state.active_filter_id {
        match filters.iter().find(|filter| &filter.id == id) {
            Some(filter) => state.active_filter_criteria = filter.criteria.clone(),
            None => {
                state.active_filter_id = None;
                state.active_filter_criteria = Default::default();
            }
        }
    }
    state
}

#[cfg(test)]
mod tests {
    use super::BootstrapPayload;

    #[test]
    fn deserializes_bootstrap_transport_contract() {
        let payload: BootstrapPayload = serde_json::from_value(serde_json::json!({
            "font_state": {
                "fonts": [],
                "css_font_families": []
            },
            "filters": [{
                "id": "english",
                "name": "English",
                "group_name": "language",
                "criteria": {
                    "languages": ["English"],
                    "categories": []
                },
                "folder_id": null,
                "sort_order": 0,
                "created_at": 1,
                "updated_at": 1
            }],
            "folders": [],
            "tags": [],
            "family_tags": [],
            "filter_options": {
                "languages": ["English"],
                "categories": ["Serif"]
            },
            "ui_state": {
                "active_filter_id": null,
                "active_filter_criteria": {
                    "languages": [],
                    "categories": []
                },
                "sidebar_collapsed": false,
                "view_mode": "grid"
            },
            "preferences": {
                "preview_size": 24,
                "preview_text": "",
                "detail_preview_font_size": 24,
                "detail_preview_font_weight": 400,
                "detail_preview_italic": false,
                "right_sidebar_width": 320,
                "language": "zh-CN"
            }
        }))
        .expect("bootstrap payload should match the transport contract");

        assert_eq!(payload.filters[0].criteria.languages, ["English"]);
    }
}
