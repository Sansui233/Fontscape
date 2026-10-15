import { valueLabel, type Translate } from "@/i18n";
import type { FilterCriteria, SavedFilter } from "@/types/filter";

/** Sidebar 与筛选面板中语言的短标记 */
const LANGUAGE_GLYPHS: Record<string, string> = {
  English: "Aa",
  Chinese: "中",
  Japanese: "あ",
  Korean: "가",
  Russian: "Я",
  Arabic: "ع",
  Unknown: "?",
};

export function languageGlyph(language: string): string {
  return LANGUAGE_GLYPHS[language] ?? language.slice(0, 2);
}

const LANGUAGE_CODES: Record<string, string> = {
  English: "EN",
  Chinese: "ZH",
  Japanese: "JA",
  Korean: "KO",
  Russian: "RU",
  Arabic: "AR",
};

/** 卡片上的语言缩写；Unknown 不显示 */
export function languageCode(language: string): string | null {
  return LANGUAGE_CODES[language] ?? null;
}

/** Filter 条件的简短描述，如「中文, 日文 · 衬线体」 */
export function describeCriteria(t: Translate, criteria: FilterCriteria): string {
  return [
    criteria.languages.map((value) => valueLabel(t, "language", value)).join(", "),
    criteria.categories.map((value) => valueLabel(t, "category", value)).join(", "),
    criteria.name_contains.trim() && t("filter.nameChip", criteria.name_contains.trim()),
    criteria.tag_contains.trim() && t("filter.tagChip", criteria.tag_contains.trim()),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** 内置语言预设未改名时显示译名；用户自己起的名字原样显示 */
export function filterLabel(t: Translate, filter: SavedFilter): string {
  const [language] = filter.criteria.languages;
  if (filter.group_name === "language" && language && filter.name === language) {
    return valueLabel(t, "language", language);
  }
  return filter.name;
}
