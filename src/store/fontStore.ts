import { errorText, t } from '@/i18n';
import { diffFontFiles, isNewerRevision } from '@/lib/font';
import { indexFontFacesByFamily } from '@/lib/font-filter';
import { refreshFonts, scanFonts } from '@/lib/tauri-api';
import { showToast } from '@/store/toastStore';
import type { CommandError } from '@/types/application';
import { FontChanges, FontInfo, FontState, FontStatus } from '@/types/font';
import { create } from 'zustand';

interface FontStore {
  fontState: FontState | undefined;
  fontsById: Map<string, FontInfo>;
  /** 后台发现目录变化后推来的新数据，用户点 Refresh 才载入 */
  pendingState: FontState | null;
  /** 载入数据；比界面当前数据旧时忽略，返回是否载入 */
  setFontState: (state: FontState) => boolean;
  /** 保存推来的数据；不比界面当前数据和已有推送新时忽略。传 null 丢弃 */
  setPendingState: (state: FontState | null) => void;
  /** 增量刷新并直接载入结果，返回相对界面原数据的变化；失败时抛出 CommandError */
  refresh: () => Promise<FontChanges>;
  /** 忽略缓存、重新解析全部文件并载入；失败时抛出 CommandError */
  rebuild: () => Promise<FontState>;
  updateFontStatus: (fontId: string, status: FontStatus) => void;
  getFontById: (fontId: string) => FontInfo | undefined;
  getFontsByCssFamily: (familyName: string) => FontInfo[];
}

const indexById = (fonts: FontInfo[]) => new Map(fonts.map((font) => [font.id, font]));

export const useFontStore = create<FontStore>((set, get) => ({
  fontState: undefined,
  fontsById: new Map(),
  pendingState: null,
  setFontState: (state) => {
    const { fontState: current, pendingState: pending } = get();
    // 事件与命令返回值的到达顺序没有保证，只前进不后退
    if (current && isNewerRevision(current.revision, state.revision)) return false;
    set({
      fontState: state,
      fontsById: indexById(state.fonts),
      pendingState: pending && isNewerRevision(pending.revision, state.revision) ? pending : null,
    });
    return true;
  },
  setPendingState: (state) => {
    const { fontState: current, pendingState: pending } = get();
    if (state && current && !isNewerRevision(state.revision, current.revision)) return;
    if (state && pending && !isNewerRevision(state.revision, pending.revision)) return;
    set({ pendingState: state });
  },
  refresh: async () => {
    const state = await refreshFonts();
    const current = get().fontState;
    const changes = current ? diffFontFiles(current, state) : { added: 0, modified: 0, removed: 0 };
    // 界面已有更新的数据时不载入，也就没有变化可报告
    return get().setFontState(state) ? changes : { added: 0, modified: 0, removed: 0 };
  },
  rebuild: async () => {
    const state = await scanFonts();
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

/** 用户手动刷新：直接载入，用 3 秒通知告知结果 */
export async function refreshFontsWithToast() {
  try {
    const { added, modified, removed } = await useFontStore.getState().refresh();
    const message =
      added + modified + removed === 0
        ? t('fontChanges.upToDate')
        : t('fontChanges.refreshed', added, modified, removed);
    showToast(message, 'info', 3000);
  } catch (error) {
    showToast(t('fontChanges.refreshFailed', errorText(t, error as CommandError)), 'error');
  }
}

/** 重建缓存：全部文件都会重新解析，按文件对比没有意义，只报告家族数 */
export async function rebuildFontsWithToast() {
  try {
    const state = await useFontStore.getState().rebuild();
    showToast(t('settings.rebuildDone', state.css_font_families.length), 'info', 3000);
  } catch (error) {
    showToast(t('settings.rebuildFailed', errorText(t, error as CommandError)), 'error');
  }
}
