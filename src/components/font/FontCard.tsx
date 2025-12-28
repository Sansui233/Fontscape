import { ContextMenu } from "@/components/ui/ContextMenu";
import { checkGlyphsInFont, toggleFont } from "@/lib/tauri-api";
import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { FontInfo } from "@/types/font";
import { Ban, Check, CheckSquare, Info } from "lucide-react";
import { useEffect, useState } from "react";

interface FontCardProps {
  font: FontInfo;
  onShowInfo: (font: FontInfo) => void;
}

export function FontCard({ font, onShowInfo }: FontCardProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [displayText, setdisplayText] = useState("");

  const updateFontStatus = useFontStore((state) => state.updateFontStatus);
  const { multiSelectMode, selectedFontIds, toggleFontSelection, previewText } = useUIStore();
  const setMultiSelectMode = useUIStore((state) => state.setMultiSelectMode);

  // Get display name based on locale
  const store = useUIStore()
  const displayName = (store.language === 'zh-CN' && font.family_zh) ? font.family_zh : font.family;


  // 检查 font 是否包含预览文本的字形，没有的用方框替代，以避免 css fallback 问题
  useEffect(() => {
    // Use preview text if available, otherwise use display name
    const previewDisplayText = previewText.trim() || displayName;
    checkGlyphsInFont(font.path, previewDisplayText).then(results => {
      const constructedText = results.map(res => res.exists ? res.glyph : '□').join('');
      setdisplayText(constructedText);
    }).catch(error => {
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
        onShowInfo(font);
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
      icon: font.status === "Enabled"
        ? <Ban className="w-4 h-4" />
        : <Check className="w-4 h-4" />,
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
            onShowInfo(font);
          }
        }}
        className={`
          group relative overflow-hidden rounded-lg border bg-card p-6
          transition-all hover:shadow-lg hover:border-primary
          ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border'}
          ${multiSelectMode ? 'cursor-pointer' : ''}
        `}
      >
        {/* 多选模式：复选框 */}
        {multiSelectMode && (
          <div className="absolute top-3 left-3 z-10">
            <div className={`
              w-5 h-5 rounded border-2 flex items-center justify-center
              ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}
            `}>
              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
          </div>
        )}

        {/* 状态指示器 */}
        <div className="absolute top-3 right-3">
          <div
            className={`h-2 w-2 rounded-full ${font.status === 'Enabled' ? 'bg-green-500' :
              font.status === 'Disabled' ? 'bg-gray-400' :
                'bg-blue-500'
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
            }}
          >
            {displayText}
          </div>
        </div>

        {/* 字体信息 */}
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground truncate" title={font.full_name}>
            {displayName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {font.style} • {font.format}
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
