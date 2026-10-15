import { useI18n, valueLabel } from "@/i18n";
import { languageGlyph } from "@/lib/filter-labels";
import { cn } from "@/lib/utils";
import type { CriteriaField, TextCriteriaField } from "@/store/filterStore";
import type { FilterCriteria, FilterOptions } from "@/types/filter";
import { Check } from "lucide-react";

interface FilterFieldsProps {
  criteria: FilterCriteria;
  options: FilterOptions;
  onToggle: (field: CriteriaField, value: string) => void;
  onClear: (field: CriteriaField) => void;
  onText: (field: TextCriteriaField, value: string) => void;
  /** 查找文字，只过滤显示的选项，不影响已选中的值 */
  query?: string;
}

/** 筛选面板与编辑弹窗共用：名称 / 标签文本条件 + Language / Category 多选 */
export function FilterFields({ criteria, options, onToggle, onClear, onText, query = "" }: FilterFieldsProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="space-y-1.5 px-1">
        <TextField
          label={t("filter.nameContains")}
          value={criteria.name_contains}
          placeholder={t("filter.textPlaceholder")}
          onChange={(value) => onText("name_contains", value)}
        />
        <TextField
          label={t("filter.tagContains")}
          value={criteria.tag_contains}
          placeholder={t("filter.textPlaceholder")}
          onChange={(value) => onText("tag_contains", value)}
        />
      </div>
      <Field
        label={t("filter.language")}
        field="languages"
        labelOf={(value) => valueLabel(t, "language", value)}
        values={options.languages}
        selected={criteria.languages}
        onToggle={onToggle}
        onClear={onClear}
        query={query}
        renderIcon={(value) => (
          <span className="w-4 text-center text-[11px] text-muted-foreground">{languageGlyph(value)}</span>
        )}
      />
      <Field
        label={t("filter.category")}
        field="categories"
        labelOf={(value) => valueLabel(t, "category", value)}
        values={options.categories}
        selected={criteria.categories}
        onToggle={onToggle}
        onClear={onClear}
        query={query}
      />
    </div>
  );
}

interface FieldProps {
  label: string;
  field: CriteriaField;
  values: string[];
  selected: string[];
  onToggle: (field: CriteriaField, value: string) => void;
  onClear: (field: CriteriaField) => void;
  query: string;
  labelOf: (value: string) => string;
  renderIcon?: (value: string) => React.ReactNode;
}

function Field({ label, field, values, selected, onToggle, onClear, query, labelOf, renderIcon }: FieldProps) {
  const { t } = useI18n();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  // 同时匹配原值与译名，方便用任一语言查找
  const visible = values.filter((value) =>
    [value, labelOf(value)].some((text) => text.toLocaleLowerCase().includes(normalizedQuery))
  );

  return (
    <section>
      <div className="flex items-center justify-between h-6 px-1">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {label}
          {selected.length > 0 && <span className="ml-1 text-brand">{selected.length}</span>}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onClear(field)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            {t("filter.clear")}
          </button>
        )}
      </div>
      <ul className="space-y-px">
        {visible.map((value) => {
          const checked = selected.includes(value);
          return (
            <li key={value}>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={checked}
                onClick={() => onToggle(field, value)}
                className="w-full h-7 flex items-center gap-2 px-1.5 rounded-md text-[13px] text-left hover:bg-muted"
              >
                <span
                  className={cn(
                    "w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0",
                    checked ? "bg-brand border-brand text-brand-foreground" : "border-muted-foreground/40"
                  )}
                >
                  {checked && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                </span>
                {renderIcon?.(value)}
                <span className="truncate">{labelOf(value)}</span>
              </button>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-1.5 h-7 flex items-center text-[12px] text-muted-foreground">{t("filter.noMatches")}</li>
        )}
      </ul>
    </section>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid grid-cols-[88px_1fr] items-center gap-2">
      <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">{label}</span>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={100}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 px-2 rounded-md border border-input bg-background text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-muted disabled:text-muted-foreground placeholder:text-muted-foreground/70"
      />
    </label>
  );
}
