import { TagPicker } from "@/components/tags/TagPicker";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { errorText, useI18n } from "@/i18n";
import { useFontNames } from "@/lib/font-names";
import { toggleFont } from "@/lib/tauri-api";
import { useFontStore } from "@/store/fontStore";
import { showToast } from "@/store/toastStore";
import { useUIStore } from "@/store/uiStore";
import type { CommandError } from "@/types/application";
import type { CssFontFamily, FontInfo } from "@/types/font";
import { Ban, Check, CheckSquare, Info, Tag as TagIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { FontInfoModal } from "./FontInfoModal";

/** Grid 与 List 共用的字体右键菜单，以及它打开的信息弹窗、标签选择器 */
export function useFontContextMenu() {
  const { t } = useI18n();
  const { familyName } = useFontNames();
  const updateFontStatus = useFontStore((state) => state.updateFontStatus);
  const setMultiSelectMode = useUIStore((state) => state.setMultiSelectMode);
  const toggleFontSelection = useUIStore((state) => state.toggleFontSelection);

  const [menu, setMenu] = useState<{ x: number; y: number; family: CssFontFamily; font: FontInfo } | null>(null);
  const [infoFont, setInfoFont] = useState<FontInfo | null>(null);
  const [tagging, setTagging] = useState<{ family: string; title: string } | null>(null);

  const openMenu = useCallback((event: React.MouseEvent, family: CssFontFamily, font: FontInfo) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, family, font });
  }, []);
  const showInfo = useCallback((font: FontInfo) => setInfoFont(font), []);

  async function handleToggle(font: FontInfo) {
    const enable = font.status === "Disabled";
    try {
      await toggleFont(font.id, enable);
      updateFontStatus(font.id, enable ? "Enabled" : "Disabled");
    } catch (error) {
      showToast(errorText(t, error as CommandError), "error");
    }
  }

  const element = (
    <>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            {
              label: t("menu.info"),
              icon: <Info />,
              onClick: () => setInfoFont(menu.font),
            },
            {
              label: t("menu.tags"),
              icon: <TagIcon />,
              onClick: () => setTagging({ family: menu.family.name, title: familyName(menu.font) }),
            },
            {
              label: t("menu.multiSelect"),
              icon: <CheckSquare />,
              onClick: () => {
                setMultiSelectMode(true);
                toggleFontSelection(menu.font.id);
              },
            },
            {
              label: menu.font.status === "Disabled" ? t("menu.enable") : t("menu.disable"),
              icon: menu.font.status === "Disabled" ? <Check /> : <Ban />,
              onClick: () => handleToggle(menu.font),
              disabled: menu.font.status === "SystemFont",
              danger: menu.font.status === "Enabled",
            },
          ]}
        />
      )}
      {infoFont && <FontInfoModal font={infoFont} onClose={() => setInfoFont(null)} />}
      {tagging && (
        <TagPicker families={[tagging.family]} title={tagging.title} onClose={() => setTagging(null)} />
      )}
    </>
  );

  return { openMenu, showInfo, element };
}
