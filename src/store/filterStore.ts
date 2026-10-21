import { sameCriteria } from "@/lib/font-filter";
import * as api from "@/lib/tauri-api";
import type { PersistedUIState } from "@/types/application";
import {
  EMPTY_FILTER_CRITERIA,
  withCriteriaDefaults,
  type CreateFilterInput,
  type DeleteFolderMode,
  type FilterCriteria,
  type FilterFolder,
  type FilterOptions,
  type SavedFilter,
  type UpdateFilterInput,
} from "@/types/filter";
import { create } from "zustand";

/** 多选类条件字段 */
export type CriteriaField = "languages" | "categories";
/** 文本类条件字段 */
export type TextCriteriaField = "name_contains" | "tag_contains";

interface FilterStore {
  filters: SavedFilter[];
  folders: FilterFolder[];
  options: FilterOptions;
  /** 当前生效的条件；可能来自某个 Filter，也可能是未命名的即时条件 */
  criteria: FilterCriteria;
  /** 当前选中的 Filter；条件被修改后与原 Filter 不同时自动取消 */
  activeFilterId: string | null;
  /** 搜索文字与条件同时生效，但不存入命名 Filter */
  searchText: string;

  hydrate: (
    filters: SavedFilter[],
    folders: FilterFolder[],
    options: FilterOptions,
    uiState: PersistedUIState
  ) => void;
  /** 指定 activeFilterId 时，只有条件与该 Filter 一致才选中它 */
  setCriteria: (criteria: FilterCriteria, activeFilterId?: string | null) => void;
  toggleValue: (field: CriteriaField, value: string) => void;
  setText: (field: TextCriteriaField, value: string) => void;
  clearCriteria: () => void;
  setSearchText: (text: string) => void;

  // 以下 action 先写后端，成功后才更新状态；失败时抛出 CommandError，状态不变
  createFilter: (input: CreateFilterInput) => Promise<SavedFilter>;
  updateFilter: (input: UpdateFilterInput) => Promise<SavedFilter>;
  deleteFilter: (id: string) => Promise<void>;
  moveFilter: (id: string, folderId: string | null) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<FilterFolder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  moveFolder: (id: string, parentId: string | null) => Promise<void>;
  deleteFolder: (id: string, mode: DeleteFolderMode) => Promise<void>;
}

const normalizeFilter = (filter: SavedFilter): SavedFilter => ({
  ...filter,
  criteria: withCriteriaDefaults(filter.criteria),
});

/** 文件夹及其所有子孙文件夹的 ID */
export function folderSubtree(folders: FilterFolder[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parent_id && ids.has(folder.parent_id) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return ids;
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  filters: [],
  folders: [],
  options: { languages: [], categories: [] },
  criteria: EMPTY_FILTER_CRITERIA,
  activeFilterId: null,
  searchText: "",

  hydrate: (filters, folders, options, uiState) =>
    set({
      filters: filters.map(normalizeFilter),
      folders,
      options,
      criteria: withCriteriaDefaults(uiState.active_filter_criteria),
      activeFilterId: uiState.active_filter_id,
    }),

  setCriteria: (criteria, activeFilterId = get().activeFilterId) => {
    const active = get().filters.find((filter) => filter.id === activeFilterId);
    const stillActive = active && sameCriteria(active.criteria, criteria);
    set({ criteria, activeFilterId: stillActive ? activeFilterId : null });
  },

  toggleValue: (field, value) => {
    const current = get().criteria[field];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    get().setCriteria({ ...get().criteria, [field]: next });
  },

  setText: (field, value) => get().setCriteria({ ...get().criteria, [field]: value }),

  clearCriteria: () => set({ criteria: EMPTY_FILTER_CRITERIA, activeFilterId: null }),

  setSearchText: (searchText) => set({ searchText }),

  createFilter: async (input) => {
    const created = normalizeFilter(await api.createFilter(input));
    set((state) => ({
      filters: [...state.filters, created],
      criteria: created.criteria,
      activeFilterId: created.id,
    }));
    return created;
  },

  updateFilter: async (input) => {
    const updated = normalizeFilter(await api.updateFilter(input));
    set((state) => ({
      filters: state.filters.map((filter) => (filter.id === updated.id ? updated : filter)),
      // 编辑正在使用的 Filter 时同步结果；编辑其他 Filter 不切换当前筛选
      ...(state.activeFilterId === updated.id ? { criteria: updated.criteria } : {}),
    }));
    return updated;
  },

  deleteFilter: async (id) => {
    await api.deleteFilter(id);
    set((state) => ({
      filters: state.filters.filter((filter) => filter.id !== id),
      ...(state.activeFilterId === id
        ? { criteria: EMPTY_FILTER_CRITERIA, activeFilterId: null }
        : {}),
    }));
  },

  moveFilter: async (id, folderId) => {
    await api.moveFilter(id, folderId);
    set((state) => ({
      filters: state.filters.map((filter) =>
        filter.id === id ? { ...filter, folder_id: folderId } : filter
      ),
    }));
  },

  createFolder: async (name, parentId) => {
    const created = await api.createFolder({ name, parent_id: parentId });
    set((state) => ({ folders: [...state.folders, created] }));
    return created;
  },

  renameFolder: async (id, name) => {
    const renamed = await api.renameFolder(id, name);
    set((state) => ({
      folders: state.folders.map((folder) => (folder.id === id ? renamed : folder)),
    }));
  },

  moveFolder: async (id, parentId) => {
    await api.moveFolder(id, parentId);
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === id ? { ...folder, parent_id: parentId } : folder
      ),
    }));
  },

  deleteFolder: async (id, mode) => {
    const deletedFilterIds = new Set(await api.deleteFolder(id, mode));
    set((state) => {
      const folder = state.folders.find((item) => item.id === id);
      const parentId = folder?.parent_id ?? null;

      let folders: FilterFolder[];
      let filters: SavedFilter[];
      if (mode === "move_contents_up") {
        folders = state.folders
          .filter((item) => item.id !== id)
          .map((item) => (item.parent_id === id ? { ...item, parent_id: parentId } : item));
        filters = state.filters.map((filter) =>
          filter.folder_id === id ? { ...filter, folder_id: parentId } : filter
        );
      } else {
        const subtree = folderSubtree(state.folders, id);
        folders = state.folders.filter((item) => !subtree.has(item.id));
        filters = state.filters.filter((filter) => !deletedFilterIds.has(filter.id));
      }

      const activeDeleted = state.activeFilterId !== null && deletedFilterIds.has(state.activeFilterId);
      return {
        folders,
        filters,
        ...(activeDeleted ? { criteria: EMPTY_FILTER_CRITERIA, activeFilterId: null } : {}),
      };
    });
  },
}));
