import type { FontNameMode, GridPreferences, PersistedUIState, Theme, UserPreferences, ViewMode } from "@/types/application";
import { create } from "zustand";

interface UIStore {
  viewMode: ViewMode;
  previewText: string;
  sidebarCollapsed: boolean;
  multiSelectMode: boolean;
  selectedFontIds: Set<string>;
  detailPreviewFontSize: number;
  detailPreviewFontWeight: number;
  detailPreviewItalic: boolean;
  rightSidebarWidth: number;
  /** 界面语言偏好："system" 或具体语言 */
  language: string;
  fontNames: FontNameMode;
  theme: Theme;
  settingsOpen: boolean;
  grid: GridPreferences;
  hydrate: (uiState: PersistedUIState, preferences: UserPreferences) => void;
  setViewMode: (mode: ViewMode) => void;
  setPreviewText: (text: string) => void;
  toggleSidebar: () => void;
  setMultiSelectMode: (mode: boolean) => void;
  toggleFontSelection: (fontId: string) => void;
  clearSelection: () => void;
  selectAll: (fontIds: string[]) => void;
  setDetailPreviewFontSize: (size: number) => void;
  setDetailPreviewFontWeight: (weight: number) => void;
  setDetailPreviewItalic: (italic: boolean) => void;
  setRightSidebarWidth: (width: number) => void;
  setLanguage: (lang: string) => void;
  setTheme: (theme: Theme) => void;
  setFontNames: (mode: FontNameMode) => void;
  setSettingsOpen: (open: boolean) => void;
  setGrid: (patch: Partial<GridPreferences>) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: "grid",
  previewText: "", // 空字符串表示使用字体家族名称
  sidebarCollapsed: false,
  multiSelectMode: false,
  selectedFontIds: new Set(),
  detailPreviewFontSize: 24,
  detailPreviewFontWeight: 400,
  detailPreviewItalic: false,
  rightSidebarWidth: 320,
  language: "system",
  fontNames: "localized",
  theme: "system",
  settingsOpen: false,
  grid: {
    card_mode: "detailed",
    preview_align: "left",
    name_align: "left",
    show_styles: true,
    show_category: true,
    show_format: true,
    show_languages: true,
  },
  hydrate: (uiState, preferences) =>
    set({
      viewMode: uiState.view_mode,
      sidebarCollapsed: uiState.sidebar_collapsed,
      previewText: preferences.preview_text,
      detailPreviewFontSize: preferences.detail_preview_font_size,
      detailPreviewFontWeight: preferences.detail_preview_font_weight,
      detailPreviewItalic: preferences.detail_preview_italic,
      rightSidebarWidth: preferences.right_sidebar_width,
      language: preferences.language,
      theme: preferences.theme,
      fontNames: preferences.font_names,
      grid: preferences.grid,
    }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setPreviewText: (text) => set({ previewText: text }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMultiSelectMode: (mode) =>
    set({ multiSelectMode: mode, selectedFontIds: new Set() }),
  toggleFontSelection: (fontId) =>
    set((state) => {
      const newSet = new Set(state.selectedFontIds);
      if (newSet.has(fontId)) {
        newSet.delete(fontId);
      } else {
        newSet.add(fontId);
      }
      return { selectedFontIds: newSet };
    }),
  clearSelection: () => set({ selectedFontIds: new Set() }),
  selectAll: (fontIds) => set({ selectedFontIds: new Set(fontIds) }),
  setDetailPreviewFontSize: (size) => set({ detailPreviewFontSize: size }),
  setDetailPreviewFontWeight: (weight) =>
    set({ detailPreviewFontWeight: weight }),
  setDetailPreviewItalic: (italic) => set({ detailPreviewItalic: italic }),
  setRightSidebarWidth: (width) => set({ rightSidebarWidth: width }),
  setLanguage: (lang) => set({ language: lang }),
  setTheme: (theme) => set({ theme }),
  setFontNames: (mode) => set({ fontNames: mode }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setGrid: (patch) => set((state) => ({ grid: { ...state.grid, ...patch } })),
}));
