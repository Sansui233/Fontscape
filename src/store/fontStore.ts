import { FontInfo, FontState, FontStatus } from '@/types/font';
import { create } from 'zustand';

interface FontStore {
  fontState: FontState | undefined;
  setFontState: (state: FontState) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  updateFontStatus: (fontId: string, status: FontStatus) => void;
  getFontById: (fontId: string) => FontInfo | undefined;
  getFontsByCssFamily: (familyName: string) => FontInfo[];
}

export const useFontStore = create<FontStore>((set, get) => ({
  fontState: undefined,
  isLoading: false,
  setFontState: (state) => set({
    fontState: state
  }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  updateFontStatus: (fontId, status) =>
    set((state) => ({
      fontState: {
        fonts: state.fontState?.fonts.map((font) =>
          font.id === fontId ? { ...font, status } : font
        ) || [],
        css_font_families: state.fontState?.css_font_families || []
      } as FontState,
    })),
  getFontById: (fontId) => get().fontState?.fonts.find((f) => f.id === fontId),
  getFontsByCssFamily: (familyName) =>
    get().fontState?.fonts.filter((f) => f.css_font_family === familyName) || [],
}));
