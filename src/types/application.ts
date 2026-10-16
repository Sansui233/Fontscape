import type { FilterCriteria, FilterFolder, FilterOptions, SavedFilter } from "./filter";
import type { FontState } from "./font";
import type { FamilyTag, Tag } from "./tag";

export type ViewMode = "grid" | "list";
export type Theme = "system" | "light" | "dark";
export type FontNameMode = "localized" | "english";

export interface PersistedUIState {
  active_filter_id: string | null;
  active_filter_criteria: FilterCriteria;
  sidebar_collapsed: boolean;
  view_mode: ViewMode;
}

export interface UserPreferences {
  preview_text: string;
  detail_preview_font_size: number;
  detail_preview_font_weight: number;
  detail_preview_italic: boolean;
  right_sidebar_width: number;
  /** 界面语言："system" 或 en / zh-CN / ja / ko */
  language: string;
  font_names: FontNameMode;
  theme: Theme;
}

export interface AppInfo {
  version: string;
  database_path: string;
  schema_version: number;
  font_directories: string[];
}

export interface BootstrapPayload {
  font_state: FontState;
  filters: SavedFilter[];
  folders: FilterFolder[];
  tags: Tag[];
  family_tags: FamilyTag[];
  filter_options: FilterOptions;
  ui_state: PersistedUIState;
  preferences: UserPreferences;
}

/** 后端 CommandError：code 用于判断，message 可直接展示 */
export interface CommandError {
  code: string;
  message: string;
}
