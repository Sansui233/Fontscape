import { Popover } from "@/components/ui/Popover";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/store/filterStore";
import { useUIStore } from "@/store/uiStore";
import { Italic, Search, Type, X } from "lucide-react";
import { RefObject, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

/** 灰色外框上的输入框底色：比背景略深，聚焦时变白 */
const fieldClass =
  "h-8 flex items-center rounded-md bg-foreground/[0.06] border border-transparent transition-colors focus-within:bg-background focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20";

/** Ctrl/⌘ + key 聚焦输入框；onTrigger 用于先展开折叠的输入框 */
function useFocusShortcut(key: string, inputRef: RefObject<HTMLInputElement | null>, onTrigger?: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === key) {
        event.preventDefault();
        onTrigger?.();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, inputRef, onTrigger]);
}

/** 平时只显示图标，点击后展开；有搜索内容时保持展开 */
export function SearchField() {
  const searchText = useFilterStore((state) => state.searchText);
  const setSearchText = useFilterStore((state) => state.setSearchText);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(searchText);
  const debouncedSet = useDebouncedCallback(setSearchText, 250);
  const { t } = useI18n();
  const open = expanded || draft.length > 0;
  const inputRef = useRef<HTMLInputElement>(null);
  // 折叠时 inputRef 为空，展开后由 autoFocus 聚焦
  useFocusShortcut("f", inputRef, () => setExpanded(true));

  function clear() {
    debouncedSet.cancel();
    setDraft("");
    setSearchText("");
    setExpanded(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        title={t("search.placeholder")}
        onClick={() => setExpanded(true)}
        className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <Search className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className={cn(fieldClass, "w-48 px-2 gap-1.5")}>
      <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        placeholder={t("search.placeholder")}
        onChange={(event) => {
          setDraft(event.target.value);
          debouncedSet(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            debouncedSet.cancel();
            setSearchText(draft);
          }
          if (event.key === "Escape") event.currentTarget.blur();
        }}
        onBlur={() => !draft && setExpanded(false)}
        className="flex-1 min-w-0 bg-transparent text-[13px] outline-none"
      />
      {draft && (
        <button type="button" title={t("search.clear")} onClick={clear} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/** 预览文字 + 字号。字号按钮打开浮层，调字号、字重和斜体；Grid 与 List 共用 */
export function PreviewField() {
  const previewText = useUIStore((state) => state.previewText);
  const setPreviewText = useUIStore((state) => state.setPreviewText);
  const size = useUIStore((state) => state.detailPreviewFontSize);
  const setSize = useUIStore((state) => state.setDetailPreviewFontSize);
  const weight = useUIStore((state) => state.detailPreviewFontWeight);
  const setWeight = useUIStore((state) => state.setDetailPreviewFontWeight);
  const italic = useUIStore((state) => state.detailPreviewItalic);
  const setItalic = useUIStore((state) => state.setDetailPreviewItalic);
  const debouncedSet = useDebouncedCallback(setPreviewText, 400);
  const { t } = useI18n();

  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusShortcut("p", inputRef);

  return (
    <div className={cn(fieldClass, "w-60 pl-2")}>
      <Type className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        defaultValue={previewText}
        placeholder={t("preview.placeholder")}
        onChange={(event) => debouncedSet(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            debouncedSet.cancel();
            setPreviewText(event.currentTarget.value);
          }
          if (event.key === "Escape") event.currentTarget.blur();
        }}
        className="flex-1 min-w-0 px-1.5 bg-transparent text-[13px] outline-none"
      />
      <button
        ref={anchorRef}
        type="button"
        title={t("preview.sizeButton")}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "h-full px-2 border-l border-foreground/10 text-[12px] tabular-nums text-muted-foreground hover:text-foreground",
          open && "text-foreground"
        )}
      >
        {size}px
      </button>

      {open && (
        <Popover anchorRef={anchorRef} onClose={() => setOpen(false)} width={240}>
          <div className="p-3 space-y-3">
            <Slider label={t("preview.size")} value={size} min={12} max={72} onChange={setSize} unit="px" />
            <Slider label={t("preview.weight")} value={weight} min={100} max={900} step={100} onChange={setWeight} />
            <button
              type="button"
              onClick={() => setItalic(!italic)}
              className={cn(
                "h-7 px-2 flex items-center gap-1.5 rounded-md text-[12px]",
                italic ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Italic className="w-3.5 h-3.5" />
              {t("preview.italic")}
            </button>
          </div>
        </Popover>
      )}
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}

function Slider({ label, value, min, max, step = 1, onChange, unit = "" }: SliderProps) {
  const progress = `${((value - min) / (max - min)) * 100}%`;
  return (
    <label className="grid grid-cols-[56px_1fr_40px] items-center gap-2 text-[12px] text-muted-foreground">
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--slider-progress": progress } as React.CSSProperties}
        className="minimal-slider"
      />
      <span className="text-right tabular-nums text-foreground">
        {value}
        {unit}
      </span>
    </label>
  );
}
