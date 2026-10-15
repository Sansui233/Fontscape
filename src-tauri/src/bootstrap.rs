use crate::filters::SavedFilter;
use crate::font::FontState;
use crate::settings::{PersistedUiState, UserPreferences};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BootstrapPayload {
    pub font_state: FontState,
    pub filters: Vec<SavedFilter>,
    pub ui_state: PersistedUiState,
    pub preferences: UserPreferences,
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
                "sort_order": 0,
                "created_at": 1,
                "updated_at": 1
            }],
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
