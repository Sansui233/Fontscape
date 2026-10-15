import { searchableNames } from "@/lib/font-names";
import type { FilterCriteria } from "@/types/filter";
import type { CssFontFamily, FontInfo, FontState } from "@/types/font";

type FamilyFaces = ReadonlyMap<string, readonly FontInfo[]>;

// fontState 只在扫描后整体替换，按 fonts 数组缓存索引即可
const indexCache = new WeakMap<readonly FontInfo[], FamilyFaces>();

export function indexFontFacesByFamily(fonts: readonly FontInfo[]): FamilyFaces {
  const cached = indexCache.get(fonts);
  if (cached) return cached;

  const index = new Map<string, FontInfo[]>();
  for (const font of fonts) {
    const faces = index.get(font.css_font_family);
    if (faces) {
      faces.push(font);
    } else {
      index.set(font.css_font_family, [font]);
    }
  }
  indexCache.set(fonts, index);
  return index;
}

export function hasCriteria(criteria: FilterCriteria): boolean {
  return (
    criteria.languages.length > 0 ||
    criteria.categories.length > 0 ||
    criteria.name_contains.trim() !== "" ||
    criteria.tag_contains.trim() !== ""
  );
}

export function sameCriteria(a: FilterCriteria, b: FilterCriteria): boolean {
  const same = (x: string[], y: string[]) =>
    x.length === y.length && x.every((value) => y.includes(value));
  return (
    same(a.languages, b.languages) &&
    same(a.categories, b.categories) &&
    a.name_contains.trim() === b.name_contains.trim() &&
    a.tag_contains.trim() === b.tag_contains.trim()
  );
}

/**
 * 同一项内多选为 OR，不同项之间为 AND。
 * Language 与 Category 必须由同一个 face 满足，避免「中文的常规体 + 英文的斜体」拼出错误匹配。
 */
function faceMatches(font: FontInfo, criteria: FilterCriteria): boolean {
  const languageMatches =
    criteria.languages.length === 0 ||
    criteria.languages.some((language) => font.languages.includes(language));
  const categoryMatches =
    criteria.categories.length === 0 ||
    criteria.categories.includes(font.category ?? "Unknown");
  return languageMatches && categoryMatches;
}

function searchMatches(
  family: CssFontFamily,
  faces: readonly FontInfo[],
  normalizedSearch: string
): boolean {
  if (!normalizedSearch) return true;
  if (family.name.toLocaleLowerCase().includes(normalizedSearch)) return true;
  return faces.some((font) =>
    searchableNames(font).some((value) =>
      value?.toLocaleLowerCase().includes(normalizedSearch)
    )
  );
}

/** 家族名 → 标签名列表；用于匹配「标签包含」 */
export type FamilyTagNames = (family: string) => string[];

export function filterFontFamilies(
  fontState: FontState,
  criteria: FilterCriteria,
  searchText = "",
  tagNames: FamilyTagNames = () => []
): CssFontFamily[] {
  const facesByFamily = indexFontFacesByFamily(fontState.fonts);
  const normalizedSearch = searchText.toLocaleLowerCase().trim();

  const nameContains = criteria.name_contains.toLocaleLowerCase().trim();
  const tagContains = criteria.tag_contains.toLocaleLowerCase().trim();

  return fontState.css_font_families.filter((family) => {
    if (
      tagContains &&
      !tagNames(family.name).some((name) => name.toLocaleLowerCase().includes(tagContains))
    ) {
      return false;
    }
    const faces = facesByFamily.get(family.name) ?? [];
    return (
      faces.some((font) => faceMatches(font, criteria)) &&
      searchMatches(family, faces, nameContains) &&
      searchMatches(family, faces, normalizedSearch)
    );
  });
}

export function countFontFamilies(
  fontState: FontState,
  criteria: FilterCriteria,
  tagNames?: FamilyTagNames
): number {
  return hasCriteria(criteria)
    ? filterFontFamilies(fontState, criteria, "", tagNames).length
    : fontState.css_font_families.length;
}
