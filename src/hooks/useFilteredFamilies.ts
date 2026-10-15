import { filterFontFamilies } from "@/lib/font-filter";
import { useFilterStore } from "@/store/filterStore";
import { useFontStore } from "@/store/fontStore";
import { familyTagNames, useTagStore } from "@/store/tagStore";
import type { FilterCriteria } from "@/types/filter";
import type { CssFontFamily, FontState } from "@/types/font";
import type { Tag } from "@/types/tag";

// 顶栏计数与 Grid/List 共用同一份结果：输入不变时直接返回上次的数组
let last: {
  fontState: FontState;
  criteria: FilterCriteria;
  searchText: string;
  familyTags: Record<string, string[]>;
  tags: Tag[];
  result: CssFontFamily[];
} | null = null;

/** 当前筛选条件 + 搜索文字下的 family 列表 */
export function useFilteredFamilies(): CssFontFamily[] {
  const fontState = useFontStore((state) => state.fontState);
  const criteria = useFilterStore((state) => state.criteria);
  const searchText = useFilterStore((state) => state.searchText);
  const tags = useTagStore((state) => state.tags);
  const familyTags = useTagStore((state) => state.familyTags);

  if (!fontState) return [];
  if (
    last &&
    last.fontState === fontState &&
    last.criteria === criteria &&
    last.searchText === searchText &&
    last.tags === tags &&
    last.familyTags === familyTags
  ) {
    return last.result;
  }
  const result = filterFontFamilies(fontState, criteria, searchText, familyTagNames(tags, familyTags));
  last = { fontState, criteria, searchText, tags, familyTags, result };
  return result;
}
