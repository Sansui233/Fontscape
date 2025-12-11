import { create } from 'zustand';

type ViewMode = 'grid' | 'list';

interface UIStore {
  viewMode: ViewMode;
  previewSize: number;
  previewText: string;
  sidebarCollapsed: boolean;
  setViewMode: (mode: ViewMode) => void;
  setPreviewSize: (size: number) => void;
  setPreviewText: (text: string) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'grid',
  previewSize: 24,
  previewText: 'Hello My font',
  sidebarCollapsed: false,
  setViewMode: (mode) => set({ viewMode: mode }),
  setPreviewSize: (size) => set({ previewSize: size }),
  setPreviewText: (text) => set({ previewText: text }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
