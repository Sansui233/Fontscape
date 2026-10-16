import { errorText, t } from "@/i18n";
import { savePreferences, saveUiState } from "@/lib/tauri-api";
import { useFilterStore } from "@/store/filterStore";
import { showToast } from "@/store/toastStore";
import { useUIStore } from "@/store/uiStore";
import type { PersistedUIState, UserPreferences } from "@/types/application";

const SAVE_DELAY_MS = 600;

function snapshotUiState(): PersistedUIState {
  const ui = useUIStore.getState();
  const filter = useFilterStore.getState();
  return {
    active_filter_id: filter.activeFilterId,
    active_filter_criteria: filter.criteria,
    sidebar_collapsed: ui.sidebarCollapsed,
    view_mode: ui.viewMode,
  };
}

function snapshotPreferences(): UserPreferences {
  const ui = useUIStore.getState();
  return {
    preview_text: ui.previewText,
    detail_preview_font_size: ui.detailPreviewFontSize,
    detail_preview_font_weight: ui.detailPreviewFontWeight,
    detail_preview_italic: ui.detailPreviewItalic,
    right_sidebar_width: ui.rightSidebarWidth,
    language: ui.language,
    font_names: ui.fontNames,
    theme: ui.theme,
  };
}

/** 只在内容变化时延迟保存，合并拖动滑块等高频修改 */
function debouncedSaver<T>(snapshot: () => T, save: (value: T) => Promise<void>) {
  let lastSaved = JSON.stringify(snapshot());
  let timer: ReturnType<typeof setTimeout> | undefined;

  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const value = snapshot();
      const json = JSON.stringify(value);
      if (json === lastSaved) return;
      save(value)
        .then(() => {
          lastSaved = json;
        })
        .catch((error) => {
          showToast(t("settings.saveFailed", errorText(t, error)), "error");
        });
    }, SAVE_DELAY_MS);
  };
}

/** bootstrap 完成后调用一次，返回取消订阅函数 */
export function startSettingsSync(): () => void {
  const saveUi = debouncedSaver(snapshotUiState, saveUiState);
  const savePrefs = debouncedSaver(snapshotPreferences, savePreferences);

  const unsubscribeUi = useUIStore.subscribe(() => {
    saveUi();
    savePrefs();
  });
  const unsubscribeFilter = useFilterStore.subscribe(saveUi);

  return () => {
    unsubscribeUi();
    unsubscribeFilter();
  };
}
