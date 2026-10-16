import { useUIStore } from "@/store/uiStore";
import { useFontStore } from "@/store/fontStore";

/** Grid / List 拖出字体家族时使用的数据类型；dragover 期间只能读 types，读不到数据 */
const FONT_DRAG_TYPE = "application/x-fontscape-families";

/**
 * 开始拖动字体家族。多选模式下拖动已选中的项时，带上所有选中项的家族。
 * 拖动预览用一个小标签代替整张卡片。
 */
export function startFontDrag(event: React.DragEvent, family: string, fontId: string, label: (count: number) => string) {
  const { multiSelectMode, selectedFontIds } = useUIStore.getState();
  const fontsById = useFontStore.getState().fontsById;
  const families =
    multiSelectMode && selectedFontIds.has(fontId)
      ? [...new Set([...selectedFontIds].map((id) => fontsById.get(id)?.css_font_family).filter((name): name is string => !!name))]
      : [family];

  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData(FONT_DRAG_TYPE, JSON.stringify(families));

  const ghost = document.createElement("div");
  ghost.textContent = label(families.length);
  ghost.className =
    "fixed -top-96 left-0 px-2.5 h-7 flex items-center rounded-md bg-foreground text-background text-[12px] font-medium whitespace-nowrap";
  document.body.appendChild(ghost);
  event.dataTransfer.setDragImage(ghost, 12, 14);
  requestAnimationFrame(() => ghost.remove());
}

export function isFontDrag(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(FONT_DRAG_TYPE);
}

export function readFontDrag(event: React.DragEvent): string[] {
  try {
    const families: unknown = JSON.parse(event.dataTransfer.getData(FONT_DRAG_TYPE));
    return Array.isArray(families) ? families.filter((name): name is string => typeof name === "string") : [];
  } catch {
    return [];
  }
}
