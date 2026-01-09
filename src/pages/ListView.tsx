import { checkGlyphsInFont } from "@/lib/tauri-api";
import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { FontInfo, FontState } from "@/types/font";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Italic } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  onNavigate: () => void;
}

function ListRow({
  font,
  displayName,
  fontSize,
  fontWeight,
  fontItalic,
  previewText,
  onNavigate,
}: ListRowProps) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    const previewDisplayText = previewText.trim() || displayName;
    checkGlyphsInFont(font.path, previewDisplayText)
      .then((results) => {
        const constructedText = results
          .map((res) => (res.exists ? res.glyph : "□"))
          .join("");
        setDisplayText(constructedText);
      })
      .catch((error) => {
        console.error("Failed to check glyphs in font:", error);
        setDisplayText(previewDisplayText);
      });
  }, [displayName, previewText, font.path]);

  const simplifyLanguage = (lang: string) => {
    if (lang.toLowerCase().includes("chinese") || lang === "Chinese")
      return "zh";
    if (lang.toLowerCase().includes("japanese") || lang === "Japanese")
      return "jp";
    if (lang.toLowerCase().includes("english") || lang === "English")
      return "en";
    return lang.substring(0, 2).toLowerCase();
  };

  const languages = font.languages.map(simplifyLanguage).slice(0, 3);

  return (
    <div className="list-row min-h-[60px]" onClick={onNavigate}>
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
  const parentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [isRestored, setIsRestored] = useState(false);
  const { fontState } = useOutletContext<{ fontState: FontState | null }>();

  const {
    detailPreviewFontSize,
    detailPreviewFontWeight,
    detailPreviewItalic,
    setDetailPreviewFontSize,
    setDetailPreviewFontWeight,
    setDetailPreviewItalic,
  } = useUIStore();

  const filtered_font_families = useMemo(() => {
    if (!fontState) return [];
    const filters = uiStore.filters ?? {};
    const langFilters = Array.isArray(filters.languages)
      ? filters.languages
      : [];
    const searchText = filters.searchText?.toLowerCase().trim() || "";

    return fontState.css_font_families.filter((fm) => {
      const font = fontStore.getFontById(fm.default_font_id);
      if (!font) return false;

      if (
        langFilters.length > 0 &&
        !langFilters.every((l) => font.languages.includes(l))
      ) {
        return false;
      }

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

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [uiStore.filters, fontState, fontStore]);

  const rowVirtualizer = useVirtualizer({
    count: filtered_font_families.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 8,
    initialOffset: scrollPositions.get("/list") || 0,
  });

  rowVirtualizer.shouldAdjustScrollPositionOnItemSizeChange = (
    item,
    delta,
    instance
  ) => {
    // 向上滚动（Backward）时，如果变动的项在当前可见范围的第一项之前
    // 则返回 true，通知虚拟化库自动补偿 scrollOffset
    return item.index < (instance.getVirtualItems()[0]?.index ?? 0);
  };

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

  if (filtered_font_families.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No fonts match your filters</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-6 px-6 py-1 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">
            Size:
          </label>
          <input
            type="range"
            min="12"
            max="48"
            step="1"
            value={detailPreviewFontSize}
            onChange={(e) => setDetailPreviewFontSize(Number(e.target.value))}
            className="minimal-slider w-24"
          />
          <input
            type="number"
            min="12"
            max="48"
            value={detailPreviewFontSize}
            onChange={(e) => setDetailPreviewFontSize(Number(e.target.value))}
            className="w-14 px-2 py-1 text-xs border border-border rounded bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">
            Weight:
          </label>
          <input
            type="range"
            min="100"
            max="900"
            step="100"
            value={detailPreviewFontWeight}
            onChange={(e) => setDetailPreviewFontWeight(Number(e.target.value))}
            className="minimal-slider w-24"
          />
          <input
            type="number"
            min="100"
            max="900"
            step="100"
            value={detailPreviewFontWeight}
            onChange={(e) => setDetailPreviewFontWeight(Number(e.target.value))}
            className="w-14 px-2 py-1 text-xs border border-border rounded bg-background"
          />
        </div>
        <button
          onClick={() => setDetailPreviewItalic(!detailPreviewItalic)}
          className={`p-2 rounded transition-colors ${
            detailPreviewItalic
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          title="Toggle italic"
        >
          <Italic className="w-4 h-4" />
        </button>
      </div>

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

            const displayName =
              uiStore.language === "zh-CN" && font.family_zh
                ? font.family_zh
                : font.family;

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
                  onNavigate={() =>
                    navigate(`/family/${encodeURIComponent(fm.name)}`)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
