import * as api from "@/lib/tauri-api";
import type { FamilyTag, Tag } from "@/types/tag";
import { create } from "zustand";

interface TagStore {
  tags: Tag[];
  /** 家族名 → 标签 ID 列表 */
  familyTags: Record<string, string[]>;

  hydrate: (tags: Tag[], assignments: FamilyTag[]) => void;
  // 以下 action 先写后端，成功后才更新状态
  createTag: (name: string) => Promise<Tag>;
  renameTag: (id: string, name: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  setFamilyTag: (tagId: string, families: string[], tagged: boolean) => Promise<void>;
}

const sortByName = (tags: Tag[]) => [...tags].sort((a, b) => a.name.localeCompare(b.name));

export const useTagStore = create<TagStore>((set) => ({
  tags: [],
  familyTags: {},

  hydrate: (tags, assignments) => {
    const familyTags: Record<string, string[]> = {};
    for (const { family, tag_id } of assignments) {
      (familyTags[family] ??= []).push(tag_id);
    }
    set({ tags: sortByName(tags), familyTags });
  },

  createTag: async (name) => {
    const tag = await api.createTag(name);
    set((state) => ({ tags: sortByName([...state.tags, tag]) }));
    return tag;
  },

  renameTag: async (id, name) => {
    const renamed = await api.renameTag(id, name);
    set((state) => ({ tags: sortByName(state.tags.map((tag) => (tag.id === id ? renamed : tag))) }));
  },

  deleteTag: async (id) => {
    await api.deleteTag(id);
    set((state) => ({
      tags: state.tags.filter((tag) => tag.id !== id),
      familyTags: Object.fromEntries(
        Object.entries(state.familyTags).map(([family, ids]) => [family, ids.filter((tagId) => tagId !== id)])
      ),
    }));
  },

  setFamilyTag: async (tagId, families, tagged) => {
    await api.setFamilyTag(tagId, families, tagged);
    set((state) => {
      const familyTags = { ...state.familyTags };
      for (const family of families) {
        const ids = (familyTags[family] ?? []).filter((id) => id !== tagId);
        familyTags[family] = tagged ? [...ids, tagId] : ids;
      }
      return { familyTags };
    });
  },
}));

/** 返回「家族名 → 标签名列表」的查询函数，供筛选匹配「标签包含」 */
export function familyTagNames(tags: Tag[], familyTags: Record<string, string[]>) {
  const names = new Map(tags.map((tag) => [tag.id, tag.name]));
  return (family: string) => (familyTags[family] ?? []).map((id) => names.get(id) ?? "");
}
