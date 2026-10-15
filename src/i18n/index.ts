import { useUIStore } from "@/store/uiStore";
import type { CommandError } from "@/types/application";
import { useCallback, useEffect } from "react";
import { en } from "./locales/en";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { zhCN } from "./locales/zh-CN";
import type { MessageArgs, MessageKey, Messages } from "./types";

export type Locale = "en" | "zh-CN" | "ja" | "ko";

/** 设置页中的语言选项，名称用各自语言书写 */
export const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

const dictionaries: Record<Locale, Messages> = { en, "zh-CN": zhCN, ja, ko };

/** 偏好值 "system" 或具体语言 → 实际使用的语言；系统语言不受支持时用英文 */
export function resolveLocale(preference: string): Locale {
  if (preference in dictionaries) return preference as Locale;
  for (const language of navigator.languages) {
    const lower = language.toLowerCase();
    if (lower.startsWith("zh")) return "zh-CN";
    if (lower.startsWith("ja")) return "ja";
    if (lower.startsWith("ko")) return "ko";
    if (lower.startsWith("en")) return "en";
  }
  return "en";
}

export type Translate = <K extends MessageKey>(key: K, ...args: MessageArgs<K>) => string;

function translate<K extends MessageKey>(locale: Locale, key: K, ...args: MessageArgs<K>): string {
  const message = dictionaries[locale][key] ?? en[key];
  return typeof message === "function" ? (message as (...a: unknown[]) => string)(...args) : message;
}

export function useI18n() {
  const preference = useUIStore((state) => state.language);
  const locale = resolveLocale(preference);
  const t = useCallback(
    ((key, ...args) => translate(locale, key, ...args)) as Translate,
    [locale]
  );
  return { t, locale };
}

/** 组件外（store、toast）使用：读取当前语言设置 */
export const t: Translate = (key, ...args) =>
  translate(resolveLocale(useUIStore.getState().language), key, ...args);

/** 同步 <html lang>：影响 CJK 统一汉字在回退字体中的字形选择 */
export function useDocumentLocale() {
  const { locale } = useI18n();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
}

function hasKey(key: string): key is MessageKey {
  return key in en;
}

/** 后端错误：已知 code 显示译文，否则显示后端原文 */
export function errorText(translateFn: Translate, error: CommandError): string {
  const key = `error.${error.code}`;
  return hasKey(key) ? (translateFn as (key: string) => string)(key) : error.message;
}

/** Language / Category 等数据值的显示名；未收录的值原样显示 */
export function valueLabel(translateFn: Translate, kind: "language" | "category" | "status", value: string) {
  const key = `${kind}.${value}`;
  return hasKey(key) ? (translateFn as (key: string) => string)(key) : value;
}
