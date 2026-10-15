import { errorText, useI18n } from "@/i18n";
import { showToast } from "@/store/toastStore";
import { useTagStore } from "@/store/tagStore";
import type { CommandError } from "@/types/application";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { TagPicker } from "./TagPicker";

/** 详情页的标签行：已有标签可直接移除，「添加标签」打开选择器 */
export function FamilyTags({ family, title }: { family: string; title: string }) {
  const { t } = useI18n();
  const tags = useTagStore((state) => state.tags);
  const tagIds = useTagStore((state) => state.familyTags[family]);
  const setFamilyTag = useTagStore((state) => state.setFamilyTag);
  const [picking, setPicking] = useState(false);

  const assigned = tags.filter((tag) => tagIds?.includes(tag.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assigned.map((tag) => (
        <span
          key={tag.id}
          className="h-6 flex items-center gap-1 pl-2 pr-1 rounded-full bg-muted text-[12px]"
        >
          {tag.name}
          <button
            type="button"
            title={t("filter.remove", tag.name)}
            onClick={() =>
              setFamilyTag(tag.id, [family], false).catch((error) =>
                showToast(errorText(t, error as CommandError), "error")
              )
            }
            className="p-0.5 rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => setPicking(true)}
        className="h-6 flex items-center gap-1 px-2 rounded-full text-[12px] text-muted-foreground/70 hover:bg-muted hover:text-foreground"
      >
        <Plus className="w-3 h-3" />
        {t("detail.addTag")}
      </button>
      {picking && <TagPicker families={[family]} title={title} onClose={() => setPicking(false)} />}
    </div>
  );
}
