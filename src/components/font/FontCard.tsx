import { ContextMenu } from "@/components/ui/ContextMenu";
import { toggleFont } from "@/lib/tauri-api";
import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { FontInfo } from "@/types/font";
import { Ban, Check, CheckSquare, Info } from "lucide-react";
import { useState } from "react";
import { FontInfoModal } from "./FontInfoModal";

interface FontCardProps {
  font: FontInfo;
}

export function FontCard({ font }: FontCardProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const updateFontStatus = useFontStore((state) => state.updateFontStatus);
  const { multiSelectMode, selectedFontIds, toggleFontSelection } = useUIStore();
  const setMultiSelectMode = useUIStore((state) => state.setMultiSelectMode);

  // Get display name based on locale
  const store = useUIStore()
  const displayName = (store.language === 'zh-CN' && font.family_zh) ? font.family_zh : font.family;

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
        setShowInfoModal(true);
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

        {/* 字体预览 - 使用 display name */}
        <div className="mb-4 overflow-hidden">
          <div
            className="transition-all text-2xl leading-normal"
            style={{
              fontFamily: `"${font.family}", sans-serif`,
            }}
          >
            {displayName}
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

      {/* Info Modal */}
      {showInfoModal && (
        <FontInfoModal
          font={font}
          onClose={() => setShowInfoModal(false)}
        />
      )}
    </>
  );
}
