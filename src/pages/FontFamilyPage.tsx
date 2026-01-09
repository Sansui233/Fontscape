import { FontInfoModal } from "@/components/font/FontInfoModal";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { FontInfo } from "@/types/font";
import { ArrowLeft, Info, Italic } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import "./FontFamilyPage.css";

// 预览文本模板
const PREVIEW_TEXTS = {
  lorem: "The quick brown fox jumps over the lazy dog. 0123456789",
  simplifiedChinese: "天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。",
  traditionalChinese: "落霞與孤鶩齊飛，秋水共長天一色。",
  japanese: "いろはにほへと ちりぬるを わかよたれそ",
  korean: "다람쥐 헌 쳇바퀴에 타고파",
  numbers: "0123456789 !@#$%^&*()",
};

export function FontFamilyPage() {
  const { familyName } = useParams<{ familyName: string }>();
  const navigate = useNavigate();
  const {
    language,
    detailPreviewFontSize,
    detailPreviewFontWeight,
    detailPreviewItalic,
    setDetailPreviewFontSize,
    setDetailPreviewFontWeight,
    setDetailPreviewItalic,
  } = useUIStore();
  const { getFontsByCssFamily, fontState } = useFontStore();

  // 页面内部选中的字体（用于预览和右侧栏）
  const [selectedFont, setSelectedFont] = useState<FontInfo | null>(null);
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    font: FontInfo;
  } | null>(null);
  // 详情 Modal
  const [infoFont, setInfoFont] = useState<FontInfo | null>(null);

  // 获取该 family 下的所有字体
  const familyFonts = familyName
    ? getFontsByCssFamily(decodeURIComponent(familyName))
    : [];

  // 找到对应的 CssFontFamily
  const cssFontFamily = fontState?.css_font_families.find(
    (f) => f.name === decodeURIComponent(familyName || "")
  );

  // 默认字体
  const defaultFont =
    familyFonts.find((f) => f.id === cssFontFamily?.default_font_id) ||
    familyFonts[0];

  // 当前预览用的字体
  const previewFont = selectedFont || defaultFont;

  // 当 familyName 变化时，重置选中字体
  useEffect(() => {
    if (defaultFont) {
      setSelectedFont(null);
    }
  }, [familyName]);

  // 处理字体选择
  const handleFontSelect = (font: FontInfo) => {
    setSelectedFont(font);
  };

  // 右键菜单处理
  const handleContextMenu = (e: React.MouseEvent, font: FontInfo) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, font });
  };

  // 获取显示名称
  const getDisplayName = (font: FontInfo) => {
    return language === "zh-CN" && font.family_zh
      ? font.family_zh
      : font.family;
  };

  // 根据字体支持的字符集获取预览文本
  const getPreviewTexts = (font: FontInfo | null) => {
    if (!font) return [PREVIEW_TEXTS.lorem];

    const texts = [PREVIEW_TEXTS.lorem];

    if (font.charsets.includes("Hans")) {
      texts.push(PREVIEW_TEXTS.simplifiedChinese);
    }
    if (font.charsets.includes("Hant")) {
      texts.push(PREVIEW_TEXTS.traditionalChinese);
    }
    if (font.charsets.includes("Jpan")) {
      texts.push(PREVIEW_TEXTS.japanese);
    }
    if (font.charsets.includes("Kore")) {
      texts.push(PREVIEW_TEXTS.korean);
    }

    return texts;
  };

  // 右键菜单项
  const menuItems = contextMenu
    ? [
        {
          label: "Info",
          icon: <Info className="w-4 h-4" />,
          onClick: () => {
            setInfoFont(contextMenu.font);
          },
        },
      ]
    : [];

  if (!previewFont || familyFonts.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Font family not found</p>
      </div>
    );
  }

  // 右侧栏显示的字体
  const displayFont = selectedFont || defaultFont;

  return (
    <>
      {/* 覆盖层 - 覆盖在 main 区域 */}
      <div className="absolute inset-0 flex bg-background overflow-hidden">
        {/* 主内容区 - 为右侧栏留出空间 */}
        <div className="flex-1 overflow-auto p-8 mr-[280px]">
          <div className="max-w-4xl mx-auto">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Back to grid"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-foreground">
                  {getDisplayName(previewFont)}
                </h2>
              </div>
            </div>

            {/* 预览区域 */}
            <div className="bg-card rounded-lg border border-border p-6 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Preview
                </h3>
                <div className="flex items-center gap-6 mr-2">
                  {/* 字体大小滑块 */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">
                      Size:
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="48"
                      step="2"
                      value={detailPreviewFontSize}
                      onChange={(e) =>
                        setDetailPreviewFontSize(Number(e.target.value))
                      }
                      className="minimal-slider w-24"
                    />
                    <input
                      type="number"
                      min="12"
                      max="96"
                      value={detailPreviewFontSize}
                      onChange={(e) =>
                        setDetailPreviewFontSize(Number(e.target.value))
                      }
                      className="w-14 px-2 py-1 text-xs border border-border rounded bg-background"
                    />
                  </div>
                  {/* 字重滑块 */}
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
                      onChange={(e) =>
                        setDetailPreviewFontWeight(Number(e.target.value))
                      }
                      className="minimal-slider w-24"
                    />
                    <input
                      type="number"
                      min="100"
                      max="900"
                      step="100"
                      value={detailPreviewFontWeight}
                      onChange={(e) =>
                        setDetailPreviewFontWeight(Number(e.target.value))
                      }
                      className="w-14 px-2 py-1 text-xs border border-border rounded bg-background"
                    />
                  </div>
                  {/* 斜体切换 */}
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
              </div>
              <div className="space-y-6">
                {getPreviewTexts(previewFont).map((text, idx) => (
                  <div
                    key={idx}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    className="leading-relaxed outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1"
                    style={{
                      fontFamily: `"${previewFont.css_font_family}", sans-serif`,
                      fontSize: `${detailPreviewFontSize}px`,
                      fontWeight: detailPreviewFontWeight,
                      fontStyle: detailPreviewItalic ? "italic" : "normal",
                    }}
                  >
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* 字体家族内的所有字体 */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Family Variants ({familyFonts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {familyFonts
                  .sort((a, b) => a.weight - b.weight)
                  .map((font) => (
                    <div
                      key={font.id}
                      onClick={() => handleFontSelect(font)}
                      onContextMenu={(e) => handleContextMenu(e, font)}
                      className={`
                        p-4 rounded-lg border cursor-pointer transition-all
                        hover:shadow-md hover:border-primary
                        ${
                          selectedFont?.id === font.id
                            ? "ring-2 ring-primary border-primary bg-primary/5"
                            : "border-border bg-card"
                        }
                      `}
                    >
                      {/* 字体预览 */}
                      <div
                        className="text-xl mb-2 truncate"
                        style={{
                          fontFamily: `"${font.css_font_family}", sans-serif`,
                          fontWeight: font.weight,
                        }}
                      >
                        {getDisplayName(font)}
                      </div>
                      {/* 字体信息 */}
                      <div className="text-sm text-muted-foreground">
                        {font.style} • {font.weight}
                        {font.is_variable && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-secondary text-xs">
                            Variable
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧栏 */}
        <RightSidebar font={displayFont ?? null} />
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={menuItems}
        />
      )}

      {/* 详情 Modal */}
      {infoFont && (
        <FontInfoModal font={infoFont} onClose={() => setInfoFont(null)} />
      )}
    </>
  );
}
