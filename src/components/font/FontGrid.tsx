import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { FontState } from "@/types/font";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useDebouncedCallback } from "use-debounce";
import { FontCard } from "./FontCard";

interface FontGridProps {
  fontState: FontState;
}

// 存储滚动位置
const scrollPositions = new Map<string, number>();

export function FontGrid({ fontState }: FontGridProps) {
  const uiStore = useUIStore();
  const fontStore = useFontStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);
  const location = useLocation();
  const [isRestored, setIsRestored] = useState(false);

  const filtered_font_families = useMemo(() => {
    const filters = uiStore.filters ?? {};
    const langFilters = Array.isArray(filters.languages)
      ? filters.languages
      : [];
    const searchText = filters.searchText?.toLowerCase().trim() || "";
    // const tagFilters = Array.isArray(filters.tags) ? filters.tags : [];

    return fontState.css_font_families.filter((fm) => {
      const font = fontStore.getFontById(fm.default_font_id);
      if (!font) return false;

      // 如果没有语言过滤，则不过滤语言；否则要求字体包含所有选中的语言
      if (
        langFilters.length > 0 &&
        !langFilters.every((l) => font.languages.includes(l))
      ) {
        return false;
      }
      // TODO 如果有标签过滤，要求字体包含所有选中的标签
      // if (tagFilters.length > 0 && !tagFilters.every((t) => (font.tags ?? []).includes(t))) {
      //   return false;
      // }

      // Search filter: check if searchText is included in family, full_name, family_zh, or full_name_zh
      if (searchText) {
        const family = font.family?.toLowerCase() || "";
        const fullName = font.full_name?.toLowerCase() || "";
        const familyZh = font.family_zh?.toLowerCase() || "";
        const fullNameZh = font.full_name_zh?.toLowerCase() || "";

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
  }, [uiStore.filters, fontState]);

  // Calculate number of rows based on columns
  const rowCount = Math.ceil(filtered_font_families.length / columns);

  // Create virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated card height + gap
    overscan: 2, // Render 2 extra rows above and below viewport
    initialOffset: scrollPositions.get(location.key) || 0,
  });

  // Scroll Upward 预防抖动
  useEffect(() => {
    rowVirtualizer.shouldAdjustScrollPositionOnItemSizeChange = () => {
      // return item.index < (instance.getVirtualItems()[0]?.index ?? 0);
      if (isRestored) {
        return false;
      }
      return true;
    };
  }, [isRestored, rowVirtualizer]);

  // Scroll restoration 预防抖动, 监听 virtualizer.isScrolling 来判断何时完成
  useLayoutEffect(() => {
    if (!parentRef.current) return;

    const checkScrolling = () => {
      if (!rowVirtualizer.isScrolling) {
        setIsRestored(true);
      } else {
        requestAnimationFrame(checkScrolling);
      }
    };

    const savedPosition = scrollPositions.get(location.key);

    if (parentRef.current && savedPosition === parentRef.current.scrollTop) {
      // The position is already correct
      // but virtualizer may still in scrolling
      requestAnimationFrame(checkScrolling);
      return;
    }

    console.debug("Fallback: Restoring scroll position to", savedPosition);
    parentRef.current.scrollTop = savedPosition ?? 0;
    requestAnimationFrame(checkScrolling);
  }, [location.key, rowVirtualizer]);

  // Debounced 保存滚动位置
  const saveScrollPosition = useDebouncedCallback(() => {
    if (parentRef.current) {
      scrollPositions.set(location.key, parentRef.current.scrollTop);
    }
  }, 100);

  // 监听滚动事件
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    element.addEventListener("scroll", saveScrollPosition);
    return () => element.removeEventListener("scroll", saveScrollPosition);
  }, [location.key, saveScrollPosition]);

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
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  if (!fontState) {
    return null;
  }

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
            width: "100%",
            position: "relative",
            opacity: isRestored ? 1 : 0,
            transition: "opacity 200ms ease-in",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIdx = virtualRow.index * columns;
            const rowFontFamilies = filtered_font_families.slice(
              startIdx,
              startIdx + columns
            );

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: "24px",
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
                  {rowFontFamilies.map((fm) => (
                    <FontCard key={fm.name} fontFamily={fm} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
