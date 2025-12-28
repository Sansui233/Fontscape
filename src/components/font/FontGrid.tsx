import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { FontInfo, FontState } from "@/types/font";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { FontCard } from "./FontCard";
import { FontInfoModal } from "./FontInfoModal";

interface FontGridProps {
  fontState: FontState;
}

export function FontGrid({ fontState }: FontGridProps) {
  const uiStore = useUIStore();
  const fontStore = useFontStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);
  const [selectedFont, setSelectedFont] = useState<FontInfo | null>(null);

  // Update columns based on window width (matching Tailwind breakpoints)
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;

      // Tailwind breakpoints: sm:640px, lg:1024px
      if (width < 640) {
        setColumns(1);
      } else if (width < 1024) {
        setColumns(2);
      } else {
        setColumns(3);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  if (!fontState) {
    return null;
  }

  const filtered_font_families = useMemo(() => {
    const filters = uiStore.filters ?? {};
    const langFilters = Array.isArray(filters.languages) ? filters.languages : [];
    const searchText = filters.searchText?.toLowerCase().trim() || '';
    // const tagFilters = Array.isArray(filters.tags) ? filters.tags : [];

    return fontState.css_font_families.filter((fm) => {
      const font = fontStore.getFontById(fm.default_font_id);
      if (!font) return false;

      // 如果没有语言过滤，则不过滤语言；否则要求字体包含所有选中的语言
      // TODO 对于中文需要更精确的匹配，比如简体中文、繁体中文等
      // TODO 后台返回的language 依靠 Glyph，而设计上说的 Language 是 main language
      // 绝对不喜欢在看日语字体时看到一堆简中。应该统一一下与 sidebar 的过滤器
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
    })
  }, [uiStore.filters, fontState]);

  // Calculate number of rows based on columns
  const rowCount = Math.ceil(filtered_font_families.length / columns);

  // Create virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated card height + gap
    overscan: 5, // Render 5 extra rows above and below viewport
  });

  if (fontState.fonts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No fonts found</p>
      </div>
    );
  }

  if (filtered_font_families.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No fonts match your filters</p>
      </div>
    );
  }

  return (
    <>
      <div ref={parentRef} className="h-full overflow-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIdx = virtualRow.index * columns;
            const rowFontFamilies = filtered_font_families.slice(startIdx, startIdx + columns);

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
                  {rowFontFamilies.map((fm) => (
                    <FontCard
                      key={fm.name}
                      fontFamily={fm}
                      onShowInfo={setSelectedFont}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal rendered outside the virtual scroll container */}
      {selectedFont && (
        <FontInfoModal
          font={selectedFont}
          onClose={() => setSelectedFont(null)}
        />
      )}
    </>
  );
}
