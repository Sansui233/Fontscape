import { indexFontFacesByFamily } from '@/lib/font-filter';
import { refreshFonts } from '@/lib/tauri-api';
import { FontChanges, FontInfo, FontState, FontStatus } from '@/types/font';
import { create } from 'zustand';

interface FontStore {
  fontState: FontState | undefined;
  fontsById: Map<string, FontInfo>;
  /** 后台发现、尚未载入界面的字体目录变化 */
  pendingChanges: FontChanges | null;
  setFontState: (state: FontState) => void;
  setPendingChanges: (changes: FontChanges | null) => void;
  /** 增量刷新并载入结果；失败时抛出 CommandError */
  refresh: () => Promise<FontState>;
  updateFontStatus: (fontId: string, status: FontStatus) => void;
  getFontById: (fontId: string) => FontInfo | undefined;
  getFontsByCssFamily: (familyName: string) => FontInfo[];
}

const indexById = (fonts: FontInfo[]) => new Map(fonts.map((font) => [font.id, font]));

export const useFontStore = create<FontStore>((set, get) => ({
  fontState: undefined,
  fontsById: new Map(),
  pendingChanges: null,
  setFontState: (state) =>
    set({ fontState: state, fontsById: indexById(state.fonts), pendingChanges: null }),
  setPendingChanges: (changes) => set({ pendingChanges: changes }),
  refresh: async () => {
    const state = await refreshFonts();
    get().setFontState(state);
    return state;
  },
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
