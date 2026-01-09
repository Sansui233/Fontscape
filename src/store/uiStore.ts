import { create } from "zustand";

type ViewMode = "grid" | "list";

interface UIStore {
  viewMode: ViewMode;
  previewSize: number;
  previewText: string;
  sidebarCollapsed: boolean;
  multiSelectMode: boolean;
  selectedFontIds: Set<string>;
  detailPreviewFontSize: number;
  detailPreviewFontWeight: number;
  detailPreviewItalic: boolean;
  setViewMode: (mode: ViewMode) => void;
  setPreviewSize: (size: number) => void;
  setPreviewText: (text: string) => void;
  toggleSidebar: () => void;
  setMultiSelectMode: (mode: boolean) => void;
  toggleFontSelection: (fontId: string) => void;
  clearSelection: () => void;
  selectAll: (fontIds: string[]) => void;
  setDetailPreviewFontSize: (size: number) => void;
  setDetailPreviewFontWeight: (weight: number) => void;
  setDetailPreviewItalic: (italic: boolean) => void;
  language: string;
  setLanguage: (lang: string) => void;
  filters: {
    languages: string[];
    tags: string[];
    searchText: string;
  };
  setFilters: (filters: {
    languages: string[];
    tags: string[];
    searchText: string;
  }) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: "grid",
  previewSize: 24,
  previewText: "", // 空字符串表示使用字体家族名称
  sidebarCollapsed: false,
  multiSelectMode: false,
  selectedFontIds: new Set(),
  detailPreviewFontSize: 24,
  detailPreviewFontWeight: 400,
  detailPreviewItalic: false,
  setViewMode: (mode) => set({ viewMode: mode }),
  setPreviewSize: (size) => set({ previewSize: size }),
  setPreviewText: (text) => set({ previewText: text }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMultiSelectMode: (mode) =>
    set({
      multiSelectMode: mode,
      selectedFontIds: mode ? new Set() : new Set(),
    }),
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
  language: "zh-CN",
  setLanguage: (lang) => set({ language: lang }),
  filters: { languages: [], tags: [], searchText: "" },
  setFilters: (f) => set({ filters: f }),
}));
