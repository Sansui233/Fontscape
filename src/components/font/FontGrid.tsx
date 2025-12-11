import { useUIStore } from "@/store/uiStore";
import { FontInfo } from "@/types/font";
import { useMemo } from "react";
import { FontCard } from "./FontCard";

interface FontGridProps {
  fonts: FontInfo[];
}

export function FontGrid({ fonts }: FontGridProps) {

  const store = useUIStore();

  const filtered_fonts = useMemo(() => {
    const filters = store.filters ?? {};
    const langFilters = Array.isArray(filters.languages) ? filters.languages : [];
    const searchText = filters.searchText?.toLowerCase().trim() || '';
    // const tagFilters = Array.isArray(filters.tags) ? filters.tags : [];

    return fonts.filter((font) => {
      // 如果没有语言过滤，则不过滤语言；否则要求字体包含所有选中的语言
      if (langFilters.length > 0 && !langFilters.every((l) => font.languages.includes(l))) {
        return false;
      }
      // TODO 如果有标签过滤，要求字体包含所有选中的标签
      // if (tagFilters.length > 0 && !tagFilters.every((t) => (font.tags ?? []).includes(t))) {
      //   return false;
      // }

      // Search filter: check if searchText is included in family, full_name, family_zh, or full_name_zh
      if (searchText) {
        const family = font.family?.toLowerCase() || '';
        const fullName = font.full_name?.toLowerCase() || '';
        const familyZh = font.family_zh?.toLowerCase() || '';
        const fullNameZh = font.full_name_zh?.toLowerCase() || '';

        const matchesSearch =
          family.includes(searchText) ||
          fullName.includes(searchText) ||
          familyZh.includes(searchText) ||
          fullNameZh.includes(searchText);

        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [store.filters, fonts]);


  if (fonts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No fonts found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {filtered_fonts.map((font) => (
        <FontCard key={font.id} font={font} />
      ))}
    </div>
  );
}
