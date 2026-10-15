import { Dialog, DialogButton } from "@/components/ui/Dialog";
import { errorText, useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { showToast } from "@/store/toastStore";
import { useTagStore } from "@/store/tagStore";
import type { CommandError } from "@/types/application";
import type { Tag } from "@/types/tag";
import { Check, Minus, Plus, Search } from "lucide-react";
import { FormEvent, useState } from "react";

/**
 * 给一个或多个字体家族设置标签。
 * 勾选状态：全部家族都有 → ✓，部分有 → –；点击后统一加上（未全有时）或统一去掉。
 * 输入框兼作查找与新建：没有同名标签时回车即新建并加上。
 */
export function TagPicker({ families, title, onClose }: { families: string[]; title?: string; onClose: () => void }) {
  const { t } = useI18n();
  const tags = useTagStore((state) => state.tags);
  const familyTags = useTagStore((state) => state.familyTags);
  const createTag = useTagStore((state) => state.createTag);
  const setFamilyTag = useTagStore((state) => state.setFamilyTag);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const visible = tags.filter((tag) => tag.name.toLocaleLowerCase().includes(trimmed.toLocaleLowerCase()));
  const canCreate =
    trimmed.length > 0 && !tags.some((tag) => tag.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase());

  function stateOf(tag: Tag): "all" | "some" | "none" {
    const count = families.filter((family) => familyTags[family]?.includes(tag.id)).length;
    return count === 0 ? "none" : count === families.length ? "all" : "some";
  }

  function report(error: unknown) {
    showToast(errorText(t, error as CommandError), "error");
  }

  function toggle(tag: Tag) {
    setFamilyTag(tag.id, families, stateOf(tag) !== "all").catch(report);
  }

  async function create(event?: FormEvent) {
    event?.preventDefault();
    if (!canCreate) return;
    try {
      const tag = await createTag(trimmed);
      await setFamilyTag(tag.id, families, true);
      setQuery("");
    } catch (error) {
      report(error);
    }
  }

  return (
    <Dialog
      title={title ?? t("tagPicker.title")}
      onClose={onClose}
      className="w-[min(340px,calc(100vw-32px))]"
      footer={<DialogButton tone="primary" onClick={onClose}>{t("content.done")}</DialogButton>}
    >
      {families.length > 1 && (
        <p className="-mt-2 mb-2 text-[12px] text-muted-foreground">{t("tagPicker.families", families.length)}</p>
      )}
      <form onSubmit={create} className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          maxLength={64}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("tagPicker.placeholder")}
          className="w-full h-8 pl-7 pr-2 rounded-md border border-input bg-background text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </form>

      <ul className="max-h-[40vh] overflow-y-auto -mx-1 space-y-px">
        {visible.map((tag) => {
          const state = stateOf(tag);
          return (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => toggle(tag)}
                className="w-full h-7 flex items-center gap-2 px-1.5 rounded-md text-[13px] text-left hover:bg-muted"
              >
                <span
                  className={cn(
                    "w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0",
                    state === "none" ? "border-muted-foreground/40" : "bg-brand border-brand text-brand-foreground"
                  )}
                >
                  {state === "all" && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                  {state === "some" && <Minus className="w-2.5 h-2.5" strokeWidth={3} />}
                </span>
                <span className="truncate">{tag.name}</span>
              </button>
            </li>
          );
        })}
        {canCreate && (
          <li>
            <button
              type="button"
              onClick={() => create()}
              className="w-full h-7 flex items-center gap-2 px-1.5 rounded-md text-[13px] text-brand text-left hover:bg-brand/10"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t("tagPicker.create", trimmed)}</span>
            </button>
          </li>
        )}
        {tags.length === 0 && !canCreate && (
          <li className="h-7 flex items-center px-1.5 text-[12px] text-muted-foreground">{t("tagPicker.empty")}</li>
        )}
      </ul>
    </Dialog>
  );
}
