import type {
  AppInfo,
  BootstrapPayload,
  CommandError,
  PersistedUIState,
  UserPreferences,
} from "@/types/application";
import type {
  CreateFilterInput,
  CreateFolderInput,
  DeleteFolderMode,
  FilterFolder,
  SavedFilter,
  UpdateFilterInput,
} from "@/types/filter";
import type { FontChanges, FontState } from "@/types/font";
import type { Tag } from "@/types/tag";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/** 把 invoke 抛出的任意值统一为 CommandError */
export function toCommandError(error: unknown): CommandError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as CommandError;
  }
  return { code: "unknown", message: String(error) };
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`Command ${command} failed:`, error);
    throw toCommandError(error);
  }
}

export function bootstrapApp(): Promise<BootstrapPayload> {
  return call("bootstrap_app");
}

export function scanFonts(): Promise<FontState> {
  return call("scan_fonts");
}

export function refreshFonts(): Promise<FontState> {
  return call("refresh_fonts");
}

/** 后台对比发现字体目录有变化时触发；数据库已更新，调用 refreshFonts 取得新数据 */
export function onFontsChanged(handler: (changes: FontChanges) => void): Promise<UnlistenFn> {
  return listen<FontChanges>("fonts_changed", (event) => handler(event.payload));
}

export function createFilter(input: CreateFilterInput): Promise<SavedFilter> {
  return call("create_filter", { input });
}

export function updateFilter(input: UpdateFilterInput): Promise<SavedFilter> {
  return call("update_filter", { input });
}

export function deleteFilter(id: string): Promise<void> {
  return call("delete_filter", { id });
}

export function moveFilter(id: string, folderId: string | null): Promise<void> {
  return call("move_filter", { id, folderId });
}

export function createFolder(input: CreateFolderInput): Promise<FilterFolder> {
  return call("create_folder", { input });
}

export function renameFolder(id: string, name: string): Promise<FilterFolder> {
  return call("rename_folder", { id, name });
}

export function moveFolder(id: string, parentId: string | null): Promise<void> {
  return call("move_folder", { id, parentId });
}

/** 返回随文件夹一起删除的筛选 ID */
export function deleteFolder(id: string, mode: DeleteFolderMode): Promise<string[]> {
  return call("delete_folder", { id, mode });
}

export function createTag(name: string): Promise<Tag> {
  return call("create_tag", { name });
}

export function renameTag(id: string, name: string): Promise<Tag> {
  return call("rename_tag", { id, name });
}

export function deleteTag(id: string): Promise<void> {
  return call("delete_tag", { id });
}

/** tagged 为 true 时给这些家族加上标签，否则去掉 */
export function setFamilyTag(tagId: string, families: string[], tagged: boolean): Promise<void> {
  return call("set_family_tag", { tagId, families, tagged });
}

export function saveUiState(uiState: PersistedUIState): Promise<void> {
  return call("save_ui_state", { uiState });
}

export function savePreferences(preferences: UserPreferences): Promise<void> {
  return call("save_preferences", { preferences });
}

export function getAppInfo(): Promise<AppInfo> {
  return call("get_app_info");
}

/** 备份并重建数据库，返回备份文件路径 */
export function resetDatabase(): Promise<string | null> {
  return call("reset_database");
}

export function toggleFont(fontId: string, enable: boolean): Promise<void> {
  return call("toggle_font", { fontId, enable });
}

export function checkGlyphsInFont(
  fontPath: string,
  text: string
): Promise<{ glyph: string; exists: boolean }[]> {
  return call("check_glyphs_in_font", { fontPath, text });
}

export function openInExplorer(path: string): Promise<void> {
  return call("open_in_explorer", { path });
}
