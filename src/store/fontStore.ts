import { create } from 'zustand';
import { FontInfo, FontStatus } from '@/types/font';

interface FontStore {
  fonts: FontInfo[];
  isLoading: boolean;
  setFonts: (fonts: FontInfo[]) => void;
  setIsLoading: (loading: boolean) => void;
  updateFontStatus: (fontId: string, status: FontStatus) => void;
}

export const useFontStore = create<FontStore>((set) => ({
  fonts: [],
  isLoading: false,
  setFonts: (fonts) => set({ fonts }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  updateFontStatus: (fontId, status) =>
    set((state) => ({
      fonts: state.fonts.map((font) =>
        font.id === fontId ? { ...font, status } : font
      ),
    })),
}));
