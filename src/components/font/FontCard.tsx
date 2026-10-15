import { TagPicker } from "@/components/tags/TagPicker";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { errorText, useI18n, valueLabel } from "@/i18n";
import { languageCode } from "@/lib/filter-labels";
import { useFontNames } from "@/lib/font-names";
import { getFontWeightName } from "@/lib/font";
import { checkGlyphsInFont, toggleFont } from "@/lib/tauri-api";
import { cn } from "@/lib/utils";
import { useFontStore } from "@/store/fontStore";
import { showToast } from "@/store/toastStore";
import { useUIStore } from "@/store/uiStore";
import type { CommandError } from "@/types/application";
import { CssFontFamily, FontFormat, FontInfo } from "@/types/font";
import { Ban, Check, CheckSquare, Info, Tag as TagIcon } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { useNavigate } from "react-router";

const FORMAT_LABELS: Record<FontFormat, string> = {
  TrueType: "TTF",
  OpenType: "OTF",
  TrueTypeCollection: "TTC",
  Woff: "WOFF",
  Woff2: "WOFF2",
};

/** 预览区高度与字号联动，FontGrid 用同一公式估算行高 */
export const previewAreaHeight = (previewSize: number) => Math.round(previewSize * 1.4) + 20;
export const CARD_INFO_HEIGHT = 52;

interface FontCardProps {
  fontFamily: CssFontFamily;
  font: FontInfo;
  onShowInfo: (font: FontInfo) => void;
}

export const FontCard = memo(function FontCard({ fontFamily, font, onShowInfo }: FontCardProps) {
  const navigate = useNavigate();
  const updateFontStatus = useFontStore((state) => state.updateFontStatus);
  const previewText = useUIStore((state) => state.previewText);
  const previewSize = useUIStore((state) => state.previewSize);
  const { t } = useI18n();
  const { familyName, fullName } = useFontNames();
  const multiSelectMode = useUIStore((state) => state.multiSelectMode);
  const isSelected = useUIStore((state) => state.selectedFontIds.has(font.id));
  const toggleFontSelection = useUIStore((state) => state.toggleFontSelection);
  const setMultiSelectMode = useUIStore((state) => state.setMultiSelectMode);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [tagging, setTagging] = useState(false);
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

  async function handleToggleFont() {
    if (font.status === "SystemFont") return;
    setIsToggling(true);
    try {
      const newStatus = font.status === "Enabled" ? "Disabled" : "Enabled";
      await toggleFont(font.id, newStatus === "Enabled");
      updateFontStatus(font.id, newStatus);
    } catch (error) {
      showToast(errorText(t, error as CommandError), "error");
    } finally {
      setIsToggling(false);
    }
  }

  const menuItems = [
    {
      label: t("menu.info"),
      icon: <Info className="w-4 h-4" />,
      onClick: () => onShowInfo(font),
    },
    {
      label: t("menu.tags"),
      icon: <TagIcon className="w-4 h-4" />,
      onClick: () => setTagging(true),
    },
    {
      label: t("menu.multiSelect"),
      icon: <CheckSquare className="w-4 h-4" />,
      onClick: () => {
        setMultiSelectMode(true);
        toggleFontSelection(font.id);
      },
    },
    {
      label: font.status === "Disabled" ? t("menu.enable") : t("menu.disable"),
      icon: font.status === "Disabled" ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />,
      onClick: handleToggleFont,
      disabled: font.status === "SystemFont" || isToggling,
      danger: font.status === "Enabled",
    },
  ];

  const styleCount = fontFamily.font_count;
  const meta = [
    font.category && font.category !== "Unknown" ? valueLabel(t, "category", font.category) : null,
    styleCount > 1 ? t("card.styles", styleCount) : getFontWeightName(font.weight),
    FORMAT_LABELS[font.format],
  ].filter(Boolean);
  const languages = font.languages.map(languageCode).filter(Boolean).slice(0, 3);

  return (
    <>
      <div
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenu({ x: event.clientX, y: event.clientY });
        }}
        onClick={() => {
          if (multiSelectMode) {
            toggleFontSelection(font.id);
          } else {
            navigate(`/family/${encodeURIComponent(fontFamily.name)}`);
          }
        }}
        className={cn(
          "group relative rounded-xl border bg-card cursor-pointer overflow-hidden",
          "transition-[border-color,box-shadow] duration-150",
          isSelected
            ? "border-brand ring-1 ring-brand"
            : "border-border hover:border-foreground/25 hover:shadow-[0_4px_16px_-6px_rgb(0_0_0/0.15)]",
          font.status === "Disabled" && "opacity-55"
        )}
      >
        {/* 预览 */}
        <div
          className="px-4 pt-4 flex items-center overflow-hidden"
          style={{ height: previewAreaHeight(previewSize) }}
        >
          <div
            className="truncate leading-[1.4] text-foreground"
            style={{
              fontFamily: `"${font.css_font_family}", sans-serif`,
              fontWeight: font.weight,
              fontSize: previewSize,
            }}
          >
            {displayText}
          </div>
        </div>

        {/* 信息：名称 + 一行元数据，语言缩写靠右 */}
        <div className="px-4 pb-3 flex items-end gap-2" style={{ height: CARD_INFO_HEIGHT }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-[13px] font-medium" title={fullName(font)}>
                {displayName}
              </h3>
              {font.is_variable && (
                <span className="shrink-0 px-1 rounded text-[10px] font-semibold leading-4 bg-muted text-muted-foreground">
                  VAR
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{meta.join(" · ")}</p>
          </div>
          <div className="shrink-0 flex gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground/80">
            {languages.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
        </div>

        {multiSelectMode ? (
          <span
            className={cn(
              "absolute top-2.5 right-2.5 w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
              isSelected ? "bg-brand border-brand text-brand-foreground" : "border-muted-foreground/50 bg-background"
            )}
          >
            {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
          </span>
        ) : (
          <button
            type="button"
            title={t("menu.info")}
            onClick={(event) => {
              event.stopPropagation();
              onShowInfo(font);
            }}
            className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={menuItems}
        />
      )}
      {tagging && <TagPicker families={[fontFamily.name]} title={displayName} onClose={() => setTagging(false)} />}
    </>
  );
});
