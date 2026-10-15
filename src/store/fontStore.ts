import { indexFontFacesByFamily } from '@/lib/font-filter';
import { FontInfo, FontState, FontStatus } from '@/types/font';
import { create } from 'zustand';

interface FontStore {
  fontState: FontState | undefined;
  fontsById: Map<string, FontInfo>;
  setFontState: (state: FontState) => void;
  updateFontStatus: (fontId: string, status: FontStatus) => void;
  getFontById: (fontId: string) => FontInfo | undefined;
  getFontsByCssFamily: (familyName: string) => FontInfo[];
}

const indexById = (fonts: FontInfo[]) => new Map(fonts.map((font) => [font.id, font]));

export const useFontStore = create<FontStore>((set, get) => ({
  fontState: undefined,
  fontsById: new Map(),
  setFontState: (state) => set({ fontState: state, fontsById: indexById(state.fonts) }),
  updateFontStatus: (fontId, status) => {
    const current = get().fontState;
    if (!current) return;
    const fonts = current.fonts.map((font) => (font.id === fontId ? { ...font, status } : font));
    set({
      fontState: { ...current, fonts },
      fontsById: indexById(fonts),
    });
  },
  getFontById: (fontId) => get().fontsById.get(fontId),
  getFontsByCssFamily: (familyName) => [
    ...(indexFontFacesByFamily(get().fontState?.fonts ?? []).get(familyName) ?? []),
  ],
}));
