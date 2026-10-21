import type { FontChanges, FontState } from "@/types/font";

/**
 * Font utility functions
 */

/**
 * CSS font-weight to human-readable name mapping
 * Based on CSS font-weight specification
 */
const FONT_WEIGHT_NAMES: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

/**
 * Convert numeric font weight to human-readable string
 * @param weight - Numeric font weight (100-900)
 * @returns Human-readable weight name (e.g., "Regular", "Bold")
 */
export function getFontWeightName(weight: number): string {
  // Direct match
  if (FONT_WEIGHT_NAMES[weight]) {
    return FONT_WEIGHT_NAMES[weight];
  }

  // Find closest weight
  const weights = Object.keys(FONT_WEIGHT_NAMES).map(Number);
  const closest = weights.reduce((prev, curr) =>
    Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev
  );

  return FONT_WEIGHT_NAMES[closest];
}

/**
 * Format font weight with both name and number
 * @param weight - Numeric font weight (100-900)
 * @returns Formatted string like "Regular (400)"
 */
export function formatFontWeight(weight: number): string {
  const name = getFontWeightName(weight);
  return `${name} (${weight})`;
}

/** 按文件路径对比两份 FontState。缓存只在文件变化时重新解析，created_at（解析时间）随之改变，据此判断修改 */
export function diffFontFiles(current: FontState, next: FontState): FontChanges {
  const signatures = (state: FontState) => {
    const map = new Map<string, string>();
    for (const font of state.fonts) {
      if (!map.has(font.path)) map.set(font.path, `${font.file_size}:${font.created_at}`);
    }
    return map;
  };
  const before = signatures(current);
  const after = signatures(next);
  const changes: FontChanges = { added: 0, modified: 0, removed: 0 };
  for (const [path, signature] of after) {
    const old = before.get(path);
    if (old === undefined) changes.added++;
    else if (old !== signature) changes.modified++;
  }
  for (const path of before.keys()) {
    if (!after.has(path)) changes.removed++;
  }
  return changes;
}

const HALF_RING = 2 ** 31;

/**
 * 环形比较 u32 版本号（同 RFC 1982）：a 沿递增方向领先 b 不到半圈即为更新，
 * 所以回绕后的 0 比 4294967295 新。
 */
export function isNewerRevision(a: number, b: number): boolean {
  const distance = (a - b) >>> 0;
  return distance !== 0 && distance < HALF_RING;
}
