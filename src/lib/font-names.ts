import { useI18n, type Locale } from "@/i18n";
import { useUIStore } from "@/store/uiStore";
import type { FontInfo } from "@/types/font";
import { useCallback } from "react";

/** 各界面语言依次尝试的本地化名称 */
const LOCALIZED_KEYS: Record<Locale, string[]> = {
  en: [],
  "zh-CN": ["zh-Hans", "zh-Hant"],
  ja: ["ja"],
  ko: ["ko"],
};

function localizedName(font: FontInfo, locale: Locale) {
  for (const key of LOCALIZED_KEYS[locale]) {
    const name = font.localized_names?.[key];
    if (name) return name;
  }
  // 兼容旧数据：只有 family_zh
  if (locale === "zh-CN" && font.family_zh) {
    return { family: font.family_zh, full_name: font.full_name_zh ?? null };
  }
  return null;
}

/** 返回按当前界面语言与「字体名称」设置决定显示名的函数 */
export function useFontNames() {
  const { locale } = useI18n();
  const mode = useUIStore((state) => state.fontNames);

  const familyName = useCallback(
    (font: FontInfo) => (mode === "localized" && localizedName(font, locale)?.family) || font.family,
    [locale, mode]
  );
  const fullName = useCallback(
    (font: FontInfo) =>
      (mode === "localized" && localizedName(font, locale)?.full_name) || font.full_name,
    [locale, mode]
  );

  return { familyName, fullName };
}

/** 搜索时匹配的所有名称（含各语言本地化名） */
export function searchableNames(font: FontInfo): (string | null | undefined)[] {
  return [
    font.family,
    font.full_name,
    font.family_zh,
    font.full_name_zh,
    ...Object.values(font.localized_names ?? {}).flatMap((name) => [name.family, name.full_name]),
  ];
}
