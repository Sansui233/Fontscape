import { FilterDialog } from "@/components/filter/FilterDialog";
import { TagPicker } from "@/components/tags/TagPicker";
import { useFontStore } from "@/store/fontStore";
import { useI18n, valueLabel } from "@/i18n";
import { languageGlyph } from "@/lib/filter-labels";
import { hasCriteria } from "@/lib/font-filter";
import { useFilterStore, type CriteriaField } from "@/store/filterStore";
import { useUIStore } from "@/store/uiStore";
import { Tag as TagIcon, X } from "lucide-react";
import { useState } from "react";

/**
 * 内容面板顶部的上下文条，只在需要时出现：
 * 多选模式显示选中数量；有筛选条件时以 chip 显示每个条件，可逐个移除或保存。
 */
export function ContentBar() {
  const multiSelectMode = useUIStore((state) => state.multiSelectMode);
  const selectedCount = useUIStore((state) => state.selectedFontIds.size);
  const setMultiSelectMode = useUIStore((state) => state.setMultiSelectMode);
  const criteria = useFilterStore((state) => state.criteria);
  const activeFilterId = useFilterStore((state) => state.activeFilterId);
  const toggleValue = useFilterStore((state) => state.toggleValue);
  const clearCriteria = useFilterStore((state) => state.clearCriteria);
  const setText = useFilterStore((state) => state.setText);
  const [saving, setSaving] = useState(false);
  const [tagging, setTagging] = useState(false);
  const selectedFontIds = useUIStore((state) => state.selectedFontIds);
  const fontsById = useFontStore((state) => state.fontsById);
  const { t } = useI18n();

  if (multiSelectMode) {
    return (
      <div className="shrink-0 flex items-center gap-3 px-4 h-11 border-b border-border">
        <span className="text-[13px] font-medium">{t("content.selected", selectedCount)}</span>
        <div className="flex-1" />
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={() => setTagging(true)}
          className="h-7 px-3 flex items-center gap-1.5 rounded-md border border-border text-[13px] hover:bg-muted disabled:opacity-40"
        >
          <TagIcon className="w-3.5 h-3.5" />
          {t("menu.tags")}
        </button>
        <button
          type="button"
          onClick={() => setMultiSelectMode(false)}
          className="h-7 px-3 rounded-md bg-brand text-brand-foreground text-[13px] font-medium hover:bg-brand/90"
        >
          {t("content.done")}
        </button>
        {tagging && (
          <TagPicker
            families={[
              ...new Set(
                [...selectedFontIds].map((id) => fontsById.get(id)?.css_font_family).filter((name): name is string => !!name)
              ),
            ]}
            onClose={() => setTagging(false)}
          />
        )}
      </div>
    );
  }

  if (!hasCriteria(criteria)) return null;

  const chips: { key: string; label: string; prefix?: string; remove: () => void }[] = [
    ...(criteria.name_contains.trim()
      ? [{
          key: "name",
          label: t("filter.nameChip", criteria.name_contains.trim()),
          remove: () => setText("name_contains", ""),
        }]
      : []),
    ...(criteria.tag_contains.trim()
      ? [{
          key: "tag",
          label: t("filter.tagChip", criteria.tag_contains.trim()),
          remove: () => setText("tag_contains", ""),
        }]
      : []),
    ...criteria.languages.map((value) => ({
      key: `languages:${value}`,
      label: valueLabel(t, "language", value),
      prefix: languageGlyph(value),
      remove: () => toggleValue("languages" as CriteriaField, value),
    })),
    ...criteria.categories.map((value) => ({
      key: `categories:${value}`,
      label: valueLabel(t, "category", value),
      remove: () => toggleValue("categories" as CriteriaField, value),
    })),
  ];

  return (
    <div className="relative z-10 shrink-0 flex flex-wrap items-center gap-1.5 px-4 pt-3">
      {/* 不加底部内边距，用一段渐隐遮罩把滚动内容过渡到 chip 条下方 */}
      <div className="pointer-events-none absolute inset-x-0 top-full h-6 bg-linear-to-b from-background to-transparent" />
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="h-6 flex items-center gap-1 pl-2 pr-1 rounded-full bg-brand/10 text-brand text-[12px]"
        >
          {chip.prefix && <span className="text-[11px] opacity-70">{chip.prefix}</span>}
          {chip.label}
          <button
            type="button"
            title={t("filter.remove", chip.label)}
            onClick={chip.remove}
            className="p-0.5 rounded-full hover:bg-brand/15"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {!activeFilterId && (
        <button
          type="button"
          onClick={() => setSaving(true)}
          className="h-6 px-2 rounded-full text-[12px] text-brand hover:bg-brand/10"
        >
          {t("filter.save")}
        </button>
      )}
      <button
        type="button"
        onClick={clearCriteria}
        className="h-6 px-2 rounded-full text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {t("filter.clearAll")}
      </button>
      {saving && <FilterDialog mode="create" onClose={() => setSaving(false)} />}
    </div>
  );
}
