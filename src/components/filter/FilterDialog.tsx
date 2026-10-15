import { Dialog, DialogButton } from "@/components/ui/Dialog";
import { errorText, useI18n } from "@/i18n";
import { filterLabel } from "@/lib/filter-labels";
import { buildFolderTree, flattenFolders } from "@/lib/folder-tree";
import { hasCriteria } from "@/lib/font-filter";
import { useFilterStore, type CriteriaField } from "@/store/filterStore";
import type { CommandError } from "@/types/application";
import type { FilterCriteria, SavedFilter } from "@/types/filter";
import { FormEvent, useMemo, useState } from "react";
import { FilterFields } from "./FilterFields";

const MAX_NAME_LENGTH = 64;

type FilterDialogProps =
  | { mode: "create"; folderId?: string | null; onClose: () => void }
  | { mode: "edit"; filter: SavedFilter; onClose: () => void };

/**
 * create：以当前条件为初始值新建，可调整条件并选择文件夹。
 * edit：修改名称、条件与文件夹；取消时丢弃所有修改。
 */
export function FilterDialog(props: FilterDialogProps) {
  const { t } = useI18n();
  const options = useFilterStore((state) => state.options);
  const folders = useFilterStore((state) => state.folders);
  const currentCriteria = useFilterStore((state) => state.criteria);
  const createFilter = useFilterStore((state) => state.createFilter);
  const updateFilter = useFilterStore((state) => state.updateFilter);

  const editing = props.mode === "edit" ? props.filter : null;
  const [name, setName] = useState(editing ? filterLabel(t, editing) : "");
  const [criteria, setCriteria] = useState<FilterCriteria>(editing?.criteria ?? currentCriteria);
  const [folderId, setFolderId] = useState<string | null>(
    editing ? editing.folder_id : props.mode === "create" ? (props.folderId ?? null) : null
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const folderOptions = useMemo(() => flattenFolders(buildFolderTree(folders, [])), [folders]);
  // 语言预设固定在「语言」分组，不提供文件夹选择
  const canChooseFolder = editing?.group_name !== "language";

  const trimmedName = name.trim();
  const nameValid = trimmedName.length > 0 && [...trimmedName].length <= MAX_NAME_LENGTH;
  const canSave = nameValid && hasCriteria(criteria) && !saving;

  function toggle(field: CriteriaField, value: string) {
    setCriteria((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        // 名称框显示的是译名；未改动时保留原名，内置预设才能继续随界面语言翻译
        const unchanged = trimmedName === filterLabel(t, editing);
        await updateFilter({
          id: editing.id,
          name: unchanged ? editing.name : trimmedName,
          criteria,
          folder_id: folderId,
        });
      } else {
        await createFilter({ name: trimmedName, criteria, folder_id: folderId });
      }
      props.onClose();
    } catch (caught) {
      // 失败时保留输入，方便修改后重试
      setError(errorText(t, caught as CommandError));
      setSaving(false);
    }
  }

  const inputClass =
    "w-full h-8 px-2.5 rounded-md border border-input bg-background text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/25";

  return (
    <Dialog
      title={editing ? t("filterDialog.editTitle") : t("filterDialog.saveTitle")}
      onClose={props.onClose}
      className="w-[min(440px,calc(100vw-32px))]"
      footer={
        <>
          <DialogButton onClick={props.onClose}>{t("dialog.cancel")}</DialogButton>
          <DialogButton tone="primary" disabled={!canSave} onClick={() => handleSubmit()}>
            {saving ? t("dialog.saving") : t("dialog.save")}
          </DialogButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className={canChooseFolder ? "grid grid-cols-[1fr_160px] gap-2" : undefined}>
          <label className="block">
            <span className="block mb-1 text-[12px] text-muted-foreground">{t("filterDialog.name")}</span>
            <input
              autoFocus
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("filterDialog.namePlaceholder")}
              className={inputClass}
            />
          </label>
          {canChooseFolder && (
            <label className="block">
              <span className="block mb-1 text-[12px] text-muted-foreground">{t("filterDialog.folder")}</span>
              <select
                value={folderId ?? ""}
                onChange={(event) => setFolderId(event.target.value || null)}
                className={inputClass}
              >
                <option value="">{t("filterDialog.topLevel")}</option>
                {folderOptions.map(({ folder, depth }) => (
                  <option key={folder.id} value={folder.id}>
                    {" ".repeat(depth + 1)}
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 py-1 rounded-lg border border-border">
          <FilterFields
            criteria={criteria}
            options={options}
            onToggle={toggle}
            onClear={(field) => setCriteria((current) => ({ ...current, [field]: [] }))}
            onText={(field, value) => setCriteria((current) => ({ ...current, [field]: value }))}
          />
        </div>

        {!hasCriteria(criteria) && (
          <p className="text-[12px] text-muted-foreground">{t("filterDialog.needCondition")}</p>
        )}
        {error && <p className="text-[12px] text-destructive">{error}</p>}
      </form>
    </Dialog>
  );
}
