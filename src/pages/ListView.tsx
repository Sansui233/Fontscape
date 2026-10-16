import { checkGlyphsInFont } from "@/lib/tauri-api";
import { EmptyState } from "@/components/font/FontGrid";
import { ContentBar } from "@/components/font/ContentBar";
import { useFilteredFamilies } from "@/hooks/useFilteredFamilies";
import { useI18n } from "@/i18n";
import { languageCode } from "@/lib/filter-labels";
import { hasCriteria } from "@/lib/font-filter";
import { useFontNames } from "@/lib/font-names";
import { SelectionMark } from "@/components/font/FontCard";
import { useFontContextMenu } from "@/components/font/useFontContextMenu";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/store/filterStore";
import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { FontInfo, FontState } from "@/types/font";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router";
import { useDebouncedCallback } from "use-debounce";
import "./ListView.css";

const scrollPositions = new Map<string, number>();

interface ListRowProps {
  font: FontInfo;
  displayName: string;
  fontSize: number;
  fontWeight: number;
  fontItalic: boolean;
  previewText: string;
  fontFamilyName: string;
  multiSelectMode: boolean;
  selected: boolean;
  onClick: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

function ListRow({
  font,
  displayName,
  fontSize,
  fontWeight,
  fontItalic,
  previewText,
  multiSelectMode,
  selected,
  onClick,
  onContextMenu,
}: ListRowProps) {
  const [displayText, setDisplayText] = useState("");

  // 字体缺少的字形替换为方框，避免浏览器回退到其他字体造成误解
  useEffect(() => {
    const previewDisplayText = previewText.trim() || displayName;
    checkGlyphsInFont(font.path, previewDisplayText)
      .then((results) => {
        setDisplayText(results.map((res) => (res.exists ? res.glyph : "□")).join(""));
      })
      .catch(() => setDisplayText(previewDisplayText));
  }, [displayName, previewText, font.path]);

  const languages = font.languages.map(languageCode).filter(Boolean).slice(0, 3);

  return (
    <div
      className={cn("list-row", multiSelectMode && "selecting", selected && "selected")}
      style={{
        // prevent virtual list scroll up jitter
        // virtualizer 会在元素挂载前根据元素高度和 estimate 值提前占位。但不是所有情况都是提前知道元素高度
        // 在官方示例中，子元素 height 是不同的固定数值的。我测下来 minHeight 使用固定数值也可以。
        // https://stackblitz.com/edit/tanstack-query-p2sjt5nc?file=src%2Fpages%2Findex.js
        // 如果 height / minHeight 为 auto，则会导致抖动，因为不知道元素高度
        // 以及，他们的 measureElement 方法没缓存，也无法使用缓存值去占位（有也会面临 window resize 的问题）
        // see https://github.com/TanStack/virtual/issues/659
        // minHeight: 20, // test
        height: fontSize * 1.2 + 25,
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {multiSelectMode && <SelectionMark selected={selected} />}
      <div
        className="list-cell preview-cell"
        style={{
          fontFamily: `"${font.css_font_family}", sans-serif`,
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          fontStyle: fontItalic ? "italic" : "normal",
        }}
      >
        {displayText}
      </div>
      <div className="list-cell tag-cell"></div>
      <div className="list-cell lang-cell">
        {languages.map((lang) => (
          <span key={lang} className="lang-tag">
            {lang}
          </span>
        ))}
      </div>
      <div className="list-cell name-cell" title={displayName}>
        {displayName}
      </div>
      <div className="list-cell status-cell">
        <div
          className={`status-dot ${
            font.status === "Enabled"
              ? "bg-green-500"
              : font.status === "Disabled"
              ? "bg-gray-400"
              : "bg-blue-500"
          }`}
        />
      </div>
    </div>
  );
}

export function ListView() {
  const uiStore = useUIStore();
  const fontStore = useFontStore();
  const criteria = useFilterStore((state) => state.criteria);
  const clearCriteria = useFilterStore((state) => state.clearCriteria);
  const parentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [isRestored, setIsRestored] = useState(false);
  const { fontState } = useOutletContext<{ fontState: FontState | null }>();

  const {
    detailPreviewFontSize,
    detailPreviewFontWeight,
    detailPreviewItalic,
  } = useUIStore();

  const filtered_font_families = useFilteredFamilies();
  const { familyName } = useFontNames();
  const { t } = useI18n();
  const fontMenu = useFontContextMenu();
  const multiSelectMode = useUIStore((state) => state.multiSelectMode);
  const selectedFontIds = useUIStore((state) => state.selectedFontIds);
  const toggleFontSelection = useUIStore((state) => state.toggleFontSelection);

  const rowVirtualizer = useVirtualizer({
    count: filtered_font_families.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
    initialOffset: scrollPositions.get("/list") || 0,
  });

  // Scroll restoration 预防抖动
  useLayoutEffect(() => {
    if (!parentRef.current) return;

    const checkScrolling = () => {
      if (!rowVirtualizer.isScrolling) {
        setIsRestored(true);
        console.debug("Scroll position alreadyrestored", savedPosition);
      } else {
        console.debug("is scroliing, wait...");
        requestAnimationFrame(checkScrolling);
      }
    };

    const savedPosition = scrollPositions.get("/list");

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

  const saveScrollPosition = useDebouncedCallback(() => {
    if (parentRef.current) {
      scrollPositions.set("/list", parentRef.current.scrollTop);
    }
  }, 100);

  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;
    element.addEventListener("scroll", saveScrollPosition);
    return () => element.removeEventListener("scroll", saveScrollPosition);
  }, [saveScrollPosition]);

  if (!fontState) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <ContentBar />

      {filtered_font_families.length === 0 && (
        <EmptyState
          message={t("empty.noMatches")}
          onClear={hasCriteria(criteria) ? clearCriteria : undefined}
        />
      )}

      {/* List */}
      <div ref={parentRef} className="flex-1 overflow-auto">
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
            const fm = filtered_font_families[virtualRow.index];
            const font = fontStore.getFontById(fm.default_font_id);
            if (!font) return null;

            const displayName = familyName(font);

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
                }}
              >
                <ListRow
                  font={font}
                  displayName={displayName}
                  fontSize={detailPreviewFontSize}
                  fontWeight={detailPreviewFontWeight}
                  fontItalic={detailPreviewItalic}
                  previewText={uiStore.previewText}
                  fontFamilyName={fm.name}
                  multiSelectMode={multiSelectMode}
                  selected={selectedFontIds.has(font.id)}
                  onContextMenu={(event) => fontMenu.openMenu(event, fm, font)}
                  onClick={() =>
                    multiSelectMode
                      ? toggleFontSelection(font.id)
                      : navigate(`/family/${encodeURIComponent(fm.name)}`)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
      {fontMenu.element}
    </div>
  );
}
