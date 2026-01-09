import { ContextMenu } from "@/components/ui/ContextMenu";
import { getFontWeightName } from "@/lib/font";
import { checkGlyphsInFont, toggleFont } from "@/lib/tauri-api";
import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { CssFontFamily, FontInfo } from "@/types/font";
import { Ban, Check, CheckSquare, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

interface FontCardProps {
  fontFamily: CssFontFamily;
  onShowInfo?: (font: FontInfo) => void; // 可选，用于右键菜单 Info
}

export function FontCard({ fontFamily, onShowInfo }: FontCardProps) {
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [displayText, setdisplayText] = useState("");
  const { getFontById } = useFontStore();
  const [font, _] = useState(getFontById(fontFamily.default_font_id));

  if (!font) {
    return null;
  }

  const updateFontStatus = useFontStore((state) => state.updateFontStatus);
  const { multiSelectMode, selectedFontIds, toggleFontSelection, previewText } =
    useUIStore();
  const setMultiSelectMode = useUIStore((state) => state.setMultiSelectMode);

  // Get display name based on locale
  const store = useUIStore();
  const displayName =
    store.language === "zh-CN" && font.family_zh ? font.family_zh : font.family;

  // 检查 font 是否包含预览文本的字形，没有的用方框替代，以避免 css fallback 问题
  useEffect(() => {
    // Use preview text if available, otherwise use display name
    const previewDisplayText = previewText.trim() || displayName;
    checkGlyphsInFont(font.path, previewDisplayText)
      .then((results) => {
        const constructedText = results
          .map((res) => (res.exists ? res.glyph : "□"))
          .join("");
        setdisplayText(constructedText);
      })
      .catch((error) => {
        console.error("Failed to check glyphs in font:", error);
        setdisplayText(previewDisplayText); // Fallback to original text on error
      });
  }, [displayName, previewText, font.path]);

  // 右键菜单处理
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  // 禁用/启用字体
  async function handleToggleFont() {
    if (!font) return;
    if (font.status === "SystemFont") return;

    setIsToggling(true);
    try {
      const newStatus = font.status === "Enabled" ? "Disabled" : "Enabled";
      await toggleFont(font.id, newStatus === "Enabled");
      updateFontStatus(font.id, newStatus);
    } catch (error) {
      console.error("Failed to toggle font:", error);
    } finally {
      setIsToggling(false);
    }
  }

  // 上下文菜单项
  const menuItems = [
    {
      label: "Info",
      icon: <Info className="w-4 h-4" />,
      onClick: () => {
        onShowInfo?.(font);
      },
    },
    {
      label: "Multi-select",
      icon: <CheckSquare className="w-4 h-4" />,
      onClick: () => {
        setMultiSelectMode(true);
        toggleFontSelection(font.id);
      },
    },
    {
      label: font.status === "Enabled" ? "Disable" : "Enable",
      icon:
        font.status === "Enabled" ? (
          <Ban className="w-4 h-4" />
        ) : (
          <Check className="w-4 h-4" />
        ),
      onClick: handleToggleFont,
      disabled: font.status === "SystemFont" || isToggling,
      danger: font.status === "Enabled",
    },
  ];

  const isSelected = selectedFontIds.has(font.id);

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        onClick={() => {
          if (multiSelectMode) {
            toggleFontSelection(font.id);
          } else {
            navigate(`/family/${encodeURIComponent(fontFamily.name)}`);
          }
        }}
        className={`
          group relative overflow-hidden rounded-lg border bg-card p-6
          transition-all hover:shadow-lg hover:border-primary cursor-pointer
          ${isSelected ? "ring-2 ring-primary border-primary" : "border-border"}
        `}
      >
        {/* 翻页书角 - 显示字体数量 */}
        {fontFamily.font_count > 1 && (
          <div
            className="absolute bottom-0 right-0 w-10 h-10 overflow-hidden"
            title={`This font family contains ${fontFamily.font_count} fonts`}
          >
            <div className="absolute bottom-0 right-0 w-0 h-0 border-solid border-b-0 border-r-[40px] border-t-[40px] border-l-0 border-transparent border-r-muted-foreground/20 bg-red" />
            <div className="absolute bottom-0 right-0 w-0 h-0 border-solid border-b-0  border-r-[39px] border-t-[39px] border-l-0 border-transparent border-r-muted/80"></div>
            <span className="absolute bottom-1 right-1.5 text-[12px] font-mono font-medium text-muted-foreground">
              {fontFamily.font_count}
            </span>
          </div>
        )}

        {/* 多选模式：复选框 */}
        {multiSelectMode && (
          <div className="absolute top-3 left-3 z-10">
            <div
              className={`
              w-5 h-5 rounded border-2 flex items-center justify-center
              ${
                isSelected
                  ? "bg-primary border-primary"
                  : "border-muted-foreground"
              }
            `}
            >
              {isSelected && (
                <Check className="w-3 h-3 text-primary-foreground" />
              )}
            </div>
          </div>
        )}

        {/* 右下角：状态指示器 */}
        <div className="absolute text text-xs top-3 right-3 flex items-center gap-2">
          {/* 状态指示器 */}
          <div
            className={`h-2 w-2 rounded-full ${
              font.status === "Enabled"
                ? "bg-green-500"
                : font.status === "Disabled"
                ? "bg-gray-400"
                : "bg-blue-500"
            }`}
            title={font.status}
          />
        </div>

        {/* 字体预览 - 使用 preview text or display name */}
        <div className="mb-4 overflow-hidden">
          <div
            className="transition-all text-2xl leading-normal h-9 overflow-hidden"
            style={{
              fontFamily: `"${font.css_font_family}", sans-serif`,
              fontWeight: font.weight,
            }}
          >
            {displayText}
            {/* 字体族指示器 */}
          </div>
        </div>

        {/* 字体信息 */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1">
            <h3
              className="font-semibold text-foreground truncate"
              title={font.full_name}
            >
              {displayName}
            </h3>
            {font.is_variable && (
              <span className="px-1.5 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-full ">
                {"V"}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {getFontWeightName(font.weight)} • {font.format}{" "}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {font.languages.slice(0, 3).map((lang) => (
              <span
                key={lang}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
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
    </>
  );
}
