import { FontInfoModal } from "@/components/font/FontInfoModal";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { FamilyTags } from "@/components/tags/FamilyTags";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { useI18n, valueLabel } from "@/i18n";
import { useFontNames } from "@/lib/font-names";
import { cn } from "@/lib/utils";
import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { FontInfo } from "@/types/font";
import { Info, Italic } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import "./FontFamilyPage.css";

// 预览文本模板，按字体支持的字符集选用
const PREVIEW_TEXTS = {
  latin: "The quick brown fox jumps over the lazy dog. 0123456789",
  simplifiedChinese: "天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。",
  traditionalChinese: "落霞與孤鶩齊飛，秋水共長天一色。",
  japanese: "いろはにほへと ちりぬるを わかよたれそ",
  korean: "다람쥐 헌 쳇바퀴에 타고파",
};

function previewTexts(font: FontInfo): string[] {
  const texts = [PREVIEW_TEXTS.latin];
  if (font.charsets.includes("Hans")) texts.push(PREVIEW_TEXTS.simplifiedChinese);
  if (font.charsets.includes("Hant")) texts.push(PREVIEW_TEXTS.traditionalChinese);
  if (font.charsets.includes("Jpan")) texts.push(PREVIEW_TEXTS.japanese);
  if (font.charsets.includes("Kore")) texts.push(PREVIEW_TEXTS.korean);
  return texts;
}

export function FontFamilyPage() {
  const { familyName = "" } = useParams<{ familyName: string }>();
  const name = decodeURIComponent(familyName);
  const { t } = useI18n();
  const { familyName: displayName } = useFontNames();
  const fontSize = useUIStore((state) => state.detailPreviewFontSize);
  const fontWeight = useUIStore((state) => state.detailPreviewFontWeight);
  const italic = useUIStore((state) => state.detailPreviewItalic);
  const setFontSize = useUIStore((state) => state.setDetailPreviewFontSize);
  const setFontWeight = useUIStore((state) => state.setDetailPreviewFontWeight);
  const setItalic = useUIStore((state) => state.setDetailPreviewItalic);
  const rightSidebarWidth = useUIStore((state) => state.rightSidebarWidth);
  const fontState = useFontStore((state) => state.fontState);
  const getFontsByCssFamily = useFontStore((state) => state.getFontsByCssFamily);

  // 页面内选中的成员（用于预览和右侧栏）；切换家族时重置
  const [selectedFont, setSelectedFont] = useState<FontInfo | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; font: FontInfo } | null>(null);
  const [infoFont, setInfoFont] = useState<FontInfo | null>(null);

  useEffect(() => setSelectedFont(null), [name]);

  const familyFonts = getFontsByCssFamily(name).sort((a, b) => a.weight - b.weight);
  const family = fontState?.css_font_families.find((item) => item.name === name);
  const defaultFont = familyFonts.find((font) => font.id === family?.default_font_id) ?? familyFonts[0];
  const font = selectedFont ?? defaultFont;

  if (!font) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <p className="text-[13px] text-muted-foreground">{t("detail.notFound")}</p>
      </div>
    );
  }

  const title = displayName(font);
  const meta = [
    t("card.styles", familyFonts.length),
    font.category && font.category !== "Unknown" ? valueLabel(t, "category", font.category) : null,
    font.languages.map((language) => valueLabel(t, "language", language)).join(", "),
  ].filter(Boolean);

  return (
    <>
      <div className="page-enter absolute inset-0 flex bg-background overflow-hidden">
        <div className="flex-1 overflow-auto" style={{ marginRight: rightSidebarWidth }}>
          <div className="max-w-4xl mx-auto px-6 py-5 space-y-6">
            <header className="space-y-2">
              <div>
                <h2 className="text-[20px] font-semibold leading-tight">{title}</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{meta.join(" · ")}</p>
              </div>
              <FamilyTags family={name} title={title} />
            </header>

            <section>
              <div className="h-8 mb-1.5 flex items-center gap-4">
                <h3 className="flex-1 text-[11px] font-semibold text-muted-foreground">{t("detail.preview")}</h3>
                <InlineSlider label={t("preview.size")} value={fontSize} min={12} max={96} onChange={setFontSize} />
                <InlineSlider
                  label={t("preview.weight")}
                  value={fontWeight}
                  min={100}
                  max={900}
                  step={100}
                  onChange={setFontWeight}
                />
                <button
                  type="button"
                  onClick={() => setItalic(!italic)}
                  title={t("detail.toggleItalic")}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-md transition-colors",
                    italic ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="rounded-lg border border-border divide-y divide-border">
                {previewTexts(font).map((text) => (
                  <div
                    key={text}
                    contentEditable
                    suppressContentEditableWarning
                    className="px-4 py-3 leading-snug outline-none focus:bg-muted/30"
                    style={{
                      fontFamily: `"${font.css_font_family}", sans-serif`,
                      fontSize,
                      fontWeight,
                      fontStyle: italic ? "italic" : "normal",
                    }}
                  >
                    {text}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="h-8 flex items-center text-[11px] font-semibold text-muted-foreground">
                {t("detail.variants", familyFonts.length)}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                {familyFonts.map((member) => (
                  <MemberCard
                    key={member.id}
                    font={member}
                    name={displayName(member)}
                    selected={member.id === font.id}
                    onSelect={() => setSelectedFont(member)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({ x: event.clientX, y: event.clientY, font: member });
                    }}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>

        <RightSidebar font={font} />
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: t("menu.info"),
              icon: <Info />,
              onClick: () => setInfoFont(contextMenu.font),
            },
          ]}
        />
      )}
      {infoFont && <FontInfoModal font={infoFont} onClose={() => setInfoFont(null)} />}
    </>
  );
}

/** 家族成员卡片：直接用 CSS 字体，缺字由浏览器回退 */
function MemberCard({
  font,
  name,
  selected,
  onSelect,
  onContextMenu,
}: {
  font: FontInfo;
  name: string;
  selected: boolean;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}) {
  const italic = /italic|oblique/i.test(font.style);

  return (
    <button
      type="button"
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={cn(
        "px-3 py-2.5 rounded-lg border text-left transition-colors",
        selected ? "border-brand ring-1 ring-brand" : "border-border hover:border-foreground/25"
      )}
    >
      <div
        className="truncate text-[18px] leading-snug"
        style={{
          fontFamily: `"${font.css_font_family}", sans-serif`,
          fontWeight: font.weight,
          fontStyle: italic ? "italic" : "normal",
        }}
      >
        {name}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="truncate">
          {font.style} · {font.weight}
        </span>
        {font.is_variable && (
          <span className="shrink-0 px-1 rounded text-[10px] font-semibold leading-4 bg-muted">VAR</span>
        )}
      </div>
    </button>
  );
}

function InlineSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
      <span className="shrink-0 whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--slider-progress": `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
        className="minimal-slider w-20"
      />
      <span className="w-7 tabular-nums text-foreground">{value}</span>
    </label>
  );
}
