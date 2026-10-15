import type { FilterCriteria } from "@/types/filter";
import type { CssFontFamily, FontInfo, FontState } from "@/types/font";

type FamilyFaces = ReadonlyMap<string, readonly FontInfo[]>;

export function indexFontFacesByFamily(fonts: readonly FontInfo[]): FamilyFaces {
  const mutableIndex = new Map<string, FontInfo[]>();

  for (const font of fonts) {
    const faces = mutableIndex.get(font.css_font_family);
    if (faces) {
      faces.push(font);
    } else {
      mutableIndex.set(font.css_font_family, [font]);
    }
  }

  return mutableIndex;
}

export function matchesFontFamily(
  family: CssFontFamily,
  facesByFamily: FamilyFaces,
  criteria: FilterCriteria,
  searchText: string
): boolean {
  const faces = facesByFamily.get(family.name) ?? [];
  if (faces.length === 0) return false;

  const languageMatches =
    criteria.languages.length === 0 ||
    criteria.languages.some((language) =>
      faces.some((font) => font.languages.includes(language))
    );
  if (!languageMatches) return false;

  const selectedCategories = criteria.categories.map((category) => category.toLocaleLowerCase());
  const categoryMatches =
    selectedCategories.length === 0 ||
    selectedCategories.some((category) =>
      faces.some((font) => font.category?.toLocaleLowerCase() === category)
    );
  if (!categoryMatches) return false;

  const normalizedSearch = searchText.toLocaleLowerCase().trim();
  if (!normalizedSearch) return true;

  if (family.name.toLocaleLowerCase().includes(normalizedSearch)) return true;

  return faces.some((font) =>
    [font.family, font.full_name, font.family_zh, font.full_name_zh].some((value) =>
      value?.toLocaleLowerCase().includes(normalizedSearch)
    )
  );
}

export function filterFontFamilies(
  fontState: FontState,
  criteria: FilterCriteria,
  searchText: string
): CssFontFamily[] {
  const facesByFamily = indexFontFacesByFamily(fontState.fonts);

  return fontState.css_font_families.filter((family) =>
    matchesFontFamily(family, facesByFamily, criteria, searchText)
  );
}

export function getAvailableCategories(fontState: FontState): string[] {
  const categoriesByNormalizedName = new Map<string, string>();

  for (const font of fontState.fonts) {
    const category = font.category?.trim();
    if (!category) continue;

    const normalizedCategory = category.toLocaleLowerCase();
    if (!categoriesByNormalizedName.has(normalizedCategory)) {
      categoriesByNormalizedName.set(normalizedCategory, category);
    }
  }

  return Array.from(categoriesByNormalizedName.values()).sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base", numeric: true })
  );
}
