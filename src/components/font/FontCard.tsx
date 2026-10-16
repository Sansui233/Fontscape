import { useI18n, valueLabel } from "@/i18n";
import { languageCode } from "@/lib/filter-labels";
import { useFontNames } from "@/lib/font-names";
import { getFontWeightName } from "@/lib/font";
import { checkGlyphsInFont } from "@/lib/tauri-api";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import type { GridCardMode } from "@/types/application";
import { CssFontFamily, FontFormat, FontInfo } from "@/types/font";
import { Check, Info } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { useNavigate } from "react-router";

const FORMAT_LABELS: Record<FontFormat, string> = {
  TrueType: "TTF",
  OpenType: "OTF",
  TrueTypeCollection: "TTC",
  Woff: "WOFF",
  Woff2: "WOFF2",
};

/** 极简：无底色、小内边距，只有预览和名称；详细：预览有底色块，名称和元数据在块外 */
const LAYOUT = {
  minimal: { previewPadding: 12, infoHeight: 26, cardPadding: 16 },
  detailed: { previewPadding: 48, infoHeight: 46, cardPadding: 0 },
} as const;

const previewAreaHeight = (fontSize: number, mode: GridCardMode) =>
  Math.round(fontSize * 1.4) + LAYOUT[mode].previewPadding;

/** 卡片高度只由字号和模式决定，FontGrid 用同一公式估算行高 */
export const cardHeight = (fontSize: number, mode: GridCardMode) =>
  previewAreaHeight(fontSize, mode) + LAYOUT[mode].infoHeight + LAYOUT[mode].cardPadding;

interface FontCardProps {
  fontFamily: CssFontFamily;
  font: FontInfo;
  onShowInfo: (font: FontInfo) => void;
  onContextMenu: (event: React.MouseEvent, family: CssFontFamily, font: FontInfo) => void;
}

export const FontCard = memo(function FontCard({ fontFamily, font, onShowInfo, onContextMenu }: FontCardProps) {
  const navigate = useNavigate();
  const previewText = useUIStore((state) => state.previewText);
  const fontSize = useUIStore((state) => state.detailPreviewFontSize);
  const fontWeight = useUIStore((state) => state.detailPreviewFontWeight);
  const italic = useUIStore((state) => state.detailPreviewItalic);
  const { t } = useI18n();
  const { familyName, fullName } = useFontNames();
  const multiSelectMode = useUIStore((state) => state.multiSelectMode);
  const isSelected = useUIStore((state) => state.selectedFontIds.has(font.id));
  const toggleFontSelection = useUIStore((state) => state.toggleFontSelection);
  const grid = useUIStore((state) => state.grid);
  const mode = grid.card_mode;
  const minimal = mode === "minimal";

  const displayName = familyName(font);
  const sourceText = previewText.trim() || displayName;
  const [displayText, setDisplayText] = useState(sourceText);

  // 字体缺少的字形替换为方框，避免浏览器回退到其他字体造成误解
  useEffect(() => {
    let cancelled = false;
    checkGlyphsInFont(font.path, sourceText)
      .then((results) => {
        if (!cancelled) {
          setDisplayText(results.map((res) => (res.exists ? res.glyph : "□")).join(""));
        }
      })
      .catch(() => {
        if (!cancelled) setDisplayText(sourceText);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceText, font.path]);

  const styleCount = fontFamily.font_count;
  const meta = [
    grid.show_styles && (styleCount > 1 ? t("card.styles", styleCount) : getFontWeightName(font.weight)),
    grid.show_category && font.category && font.category !== "Unknown" && valueLabel(t, "category", font.category),
    grid.show_format && FORMAT_LABELS[font.format],
  ].filter(Boolean);
  const languages = grid.show_languages ? font.languages.map(languageCode).filter(Boolean).slice(0, 3) : [];

  const preview = (
    <div
      className="w-full truncate leading-[1.4] text-foreground"
      style={{
        fontFamily: `"${font.css_font_family}", sans-serif`,
        fontWeight,
        fontStyle: italic ? "italic" : "normal",
        fontSize,
        textAlign: grid.preview_align,
      }}
    >
      {displayText}
    </div>
  );

  return (
    <div
      onContextMenu={(event) => onContextMenu(event, fontFamily, font)}
      onClick={() => {
        if (multiSelectMode) {
          toggleFontSelection(font.id);
        } else {
          navigate(`/family/${encodeURIComponent(fontFamily.name)}`);
        }
      }}
      className={cn(
        "group relative cursor-pointer",
        minimal && "p-2 rounded-xl transition-colors duration-150",
        minimal && (isSelected ? "bg-brand/10 ring-2 ring-brand" : "hover:bg-muted/60"),
        font.status === "Disabled" && "opacity-55"
      )}
    >
      {minimal ? (
        <>
          <div className="flex items-center overflow-hidden" style={{ height: previewAreaHeight(fontSize, mode) }}>
            {preview}
          </div>
          <h3
            className="pt-1 truncate text-[13px] text-muted-foreground"
            style={{ height: LAYOUT.minimal.infoHeight, textAlign: grid.name_align }}
            title={fullName(font)}
          >
            {displayName}
          </h3>
        </>
      ) : (
        <>
          {/* 预览：无边框的浅色底块，名称放在块外 */}
          <div
            className={cn(
              "px-5 flex items-center overflow-hidden rounded-xl transition-colors duration-150",
              isSelected ? "bg-brand/10 ring-2 ring-brand" : "bg-muted/60 group-hover:bg-muted"
            )}
            style={{ height: previewAreaHeight(fontSize, mode) }}
          >
            {preview}
          </div>

          {/* 信息：名称行（语言标签靠右，只作标记，比名称矮）+ 一行元数据 */}
          <div className="px-1 pt-2.5" style={{ height: LAYOUT.detailed.infoHeight }}>
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-[13px] font-medium" title={fullName(font)}>
                {displayName}
              </h3>
              {font.is_variable && (
                <span className="shrink-0 px-1 rounded text-[10px] font-semibold leading-4 bg-muted text-muted-foreground">
                  VAR
                </span>
              )}
              {languages.length > 0 && (
                <div className="shrink-0 ml-auto flex gap-1">
                  {languages.map((code) => (
                    <span key={code} className="px-1.5 rounded text-[10px] leading-4 bg-secondary text-secondary-foreground">
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{meta.join(" · ")}</p>
          </div>
        </>
      )}

      {multiSelectMode ? (
        <SelectionMark selected={isSelected} className="absolute top-3 right-3" />
      ) : (
        <button
          type="button"
          title={t("menu.info")}
          onClick={(event) => {
            event.stopPropagation();
            onShowInfo(font);
          }}
          className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background/70 hover:text-foreground"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

/** 多选模式下的圆形勾选标记，Grid 与 List 共用 */
export function SelectionMark({ selected, className }: { selected: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "w-4 h-4 shrink-0 rounded-full border flex items-center justify-center transition-colors",
        selected ? "bg-brand border-brand text-brand-foreground" : "border-muted-foreground/50 bg-background",
        className
      )}
    >
      {selected && <Check className="w-3 h-3" strokeWidth={3} />}
    </span>
  );
}
