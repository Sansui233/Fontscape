import { useUIStore } from "@/store/uiStore";
import { FontInfo } from "@/types/font";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { FontCard } from "./FontCard";
import { FontInfoModal } from "./FontInfoModal";

interface FontGridProps {
  fonts: FontInfo[];
}

export function FontGrid({ fonts }: FontGridProps) {
  const store = useUIStore();
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

  // Calculate number of rows based on columns
  const rowCount = Math.ceil(filtered_fonts.length / columns);

  // Create virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated card height + gap
    overscan: 5, // Render 5 extra rows above and below viewport
  });

  if (fonts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No fonts found</p>
      </div>
    );
  }

  if (filtered_fonts.length === 0) {
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
            const rowFonts = filtered_fonts.slice(startIdx, startIdx + columns);

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
                  {rowFonts.map((font) => (
                    <FontCard
                      key={font.id}
                      font={font}
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
