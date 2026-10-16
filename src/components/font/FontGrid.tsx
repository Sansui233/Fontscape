import { useFilteredFamilies } from "@/hooks/useFilteredFamilies";
import { useI18n } from "@/i18n";
import { hasCriteria } from "@/lib/font-filter";
import { useFilterStore } from "@/store/filterStore";
import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { FontState } from "@/types/font";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useDebouncedCallback } from "use-debounce";
import { cardHeight, FontCard } from "./FontCard";
import { ContentBar } from "./ContentBar";
import { useFontContextMenu } from "./useFontContextMenu";

interface FontGridProps {
  fontState: FontState;
}

const MIN_CARD_WIDTH = 260;
/** 极简卡片自带 8px 内边距，间距和外边距相应收小，文字到边缘的视觉距离与详细模式一致 */
const SPACING = {
  minimal: { gap: 8, paddingX: 16 },
  detailed: { gap: 20, paddingX: 24 },
} as const;

// 存储滚动位置
const scrollPositions = new Map<string, number>();

export function FontGrid({ fontState }: FontGridProps) {
  const getFontById = useFontStore((state) => state.getFontById);
  const criteria = useFilterStore((state) => state.criteria);
  const clearCriteria = useFilterStore((state) => state.clearCriteria);
  const fontSize = useUIStore((state) => state.detailPreviewFontSize);
  const cardMode = useUIStore((state) => state.grid.card_mode);
  const { gap: GAP, paddingX: PADDING_X } = SPACING[cardMode];

  const parentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const location = useLocation();
  const [isRestored, setIsRestored] = useState(false);
  const fontMenu = useFontContextMenu();
  const { t } = useI18n();

  const families = useFilteredFamilies();

  // 按容器宽度计算列数，侧栏收起或窗口缩放时自动调整
  const columns = Math.max(1, Math.floor((width - PADDING_X * 2 + GAP) / (MIN_CARD_WIDTH + GAP)));
  const rowCount = Math.ceil(families.length / columns);
  const rowHeight = cardHeight(fontSize, cardMode) + GAP;

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 2,
    initialOffset: scrollPositions.get(location.key) || 0,
  });

  // 卡片高度只由字号和模式决定，变化时重新测量
  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowHeight, columns, rowVirtualizer]);

  useLayoutEffect(() => {
    const element = parentRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
    if (savedPosition !== parentRef.current.scrollTop) {
      parentRef.current.scrollTop = savedPosition ?? 0;
    }
    requestAnimationFrame(checkScrolling);
  }, [location.key, rowVirtualizer]);

  const saveScrollPosition = useDebouncedCallback(() => {
    if (parentRef.current) {
      scrollPositions.set(location.key, parentRef.current.scrollTop);
    }
  }, 100);

  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;
    element.addEventListener("scroll", saveScrollPosition);
    return () => element.removeEventListener("scroll", saveScrollPosition);
  }, [location.key, saveScrollPosition]);

  return (
    <div className="flex flex-col h-full">
      <ContentBar />

      <div ref={parentRef} className="flex-1 min-h-0 overflow-auto">
        {families.length === 0 ? (
          <EmptyState
            message={fontState.fonts.length === 0 ? t("empty.noFonts") : t("empty.noMatches")}
            onClear={hasCriteria(criteria) ? clearCriteria : undefined}
          />
        ) : (
          <div
            style={{
              height: rowVirtualizer.getTotalSize() + GAP,
              width: "100%",
              position: "relative",
              opacity: isRestored ? 1 : 0,
              transition: "opacity 200ms ease-in",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIdx = virtualRow.index * columns;
              const rowFamilies = families.slice(startIdx, startIdx + columns);

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
                    padding: `${GAP}px ${PADDING_X}px 0`,
                  }}
                >
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: GAP }}
                  >
                    {rowFamilies.map((family) => {
                      const font = getFontById(family.default_font_id);
                      return font ? (
                        <FontCard
                          key={family.name}
                          fontFamily={family}
                          font={font}
                          onShowInfo={fontMenu.showInfo}
                          onContextMenu={fontMenu.openMenu}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {fontMenu.element}
    </div>
  );
}

export function EmptyState({ message, onClear }: { message: string; onClear?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-3">
      <p className="text-[13px] text-muted-foreground">{message}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="h-7 px-3 rounded-md border border-border text-[13px] hover:bg-muted"
        >
          {t("filter.clearFilter")}
        </button>
      )}
    </div>
  );
}
