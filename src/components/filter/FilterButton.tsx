import { Popover } from "@/components/ui/Popover";
import { useI18n } from "@/i18n";
import { hasCriteria } from "@/lib/font-filter";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/store/filterStore";
import { ListFilter, Search } from "lucide-react";
import { useRef, useState } from "react";
import { FilterDialog } from "./FilterDialog";
import { FilterFields } from "./FilterFields";

/** 标题栏中的筛选入口：有条件时变蓝并显示已选数量；已选条件以 chip 显示在内容区顶部 */
export function FilterButton() {
  const criteria = useFilterStore((state) => state.criteria);
  const options = useFilterStore((state) => state.options);
  const toggleValue = useFilterStore((state) => state.toggleValue);
  const setCriteria = useFilterStore((state) => state.setCriteria);
  const clearCriteria = useFilterStore((state) => state.clearCriteria);
  const setText = useFilterStore((state) => state.setText);

  const { t } = useI18n();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const active = hasCriteria(criteria);
  const selectedCount =
    criteria.languages.length +
    criteria.categories.length +
    (criteria.name_contains.trim() ? 1 : 0) +
    (criteria.tag_contains.trim() ? 1 : 0);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={t("filter.button")}
        className={cn(
          "h-8 px-2 shrink-0 flex items-center gap-1.5 rounded-md text-[13px] whitespace-nowrap transition-colors hover:bg-foreground/[0.06]",
          active ? "text-brand" : "text-muted-foreground hover:text-foreground",
          open && "bg-foreground/[0.06]"
        )}
      >
        <ListFilter className="w-4 h-4" />
        <span className="font-medium">{t("filter.button")}</span>
        {selectedCount > 0 && (
          <span className="min-w-4 h-4 px-1 rounded-full bg-brand text-brand-foreground text-[10px] font-semibold leading-4 text-center">
            {selectedCount}
          </span>
        )}
      </button>

      {open && (
        <Popover anchorRef={anchorRef} onClose={() => setOpen(false)}>
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("filter.findOption")}
                className="w-full h-7 pl-7 pr-2 rounded-md bg-muted text-[13px] outline-none focus:ring-2 focus:ring-brand/25"
              />
            </div>
          </div>
          <div className="p-2 overflow-y-auto max-h-[min(420px,60vh)]">
            <FilterFields
              criteria={criteria}
              options={options}
              onToggle={toggleValue}
              onClear={(field) => setCriteria({ ...criteria, [field]: [] })}
              onText={setText}
              query={query}
            />
          </div>
          <div className="flex items-center justify-between gap-2 p-2 border-t border-border">
            <button
              type="button"
              disabled={!active}
              onClick={clearCriteria}
              className="h-7 px-2 rounded-md text-[13px] text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              {t("filter.clearAll")}
            </button>
            <button
              type="button"
              disabled={!active}
              onClick={() => {
                setOpen(false);
                setSaving(true);
              }}
              className="h-7 px-3 rounded-md text-[13px] font-medium bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-40"
            >
              {t("filter.saveFilter")}
            </button>
          </div>
        </Popover>
      )}

      {saving && <FilterDialog mode="create" onClose={() => setSaving(false)} />}
    </>
  );
}
