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
