import type { SavedFilter, FilterCriteria } from "./filter";
import type { FontState } from "./font";

export interface PersistedUIState {
  active_filter_id: string | null;
  active_filter_criteria: FilterCriteria;
  sidebar_collapsed: boolean;
  view_mode: "grid" | "list";
}

export interface UserPreferences {
  preview_size: number;
  preview_text: string;
  detail_preview_font_size: number;
  detail_preview_font_weight: number;
  detail_preview_italic: boolean;
  right_sidebar_width: number;
  language: string;
}

export interface BootstrapPayload {
  font_state: FontState;
  filters: SavedFilter[];
  ui_state: PersistedUIState;
  preferences: UserPreferences;
}
