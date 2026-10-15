import { Dialog, DialogButton } from "@/components/ui/Dialog";
import { NameDialog } from "@/components/ui/NameDialog";
import { errorText, useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/store/filterStore";
import type { CommandError } from "@/types/application";
import type { DeleteFolderMode, FilterFolder } from "@/types/filter";
import { useState } from "react";

type FolderNameDialogProps =
  | { mode: "create"; parentId: string | null; onClose: () => void }
  | { mode: "rename"; folder: FilterFolder; onClose: () => void };

/** 新建或重命名文件夹 */
export function FolderNameDialog(props: FolderNameDialogProps) {
  const { t } = useI18n();
  const createFolder = useFilterStore((state) => state.createFolder);
  const renameFolder = useFilterStore((state) => state.renameFolder);

  return (
    <NameDialog
      title={props.mode === "rename" ? t("folderDialog.renameTitle") : t("folderDialog.newTitle")}
      initialName={props.mode === "rename" ? props.folder.name : ""}
      placeholder={t("folderDialog.namePlaceholder")}
      onSubmit={(name) =>
        props.mode === "rename" ? renameFolder(props.folder.id, name) : createFolder(name, props.parentId)
      }
      onClose={props.onClose}
    />
  );
}

/**
 * 删除文件夹。有内容时让用户选择：内容移到上一级（默认，较安全）或连同内容一起删除。
 */
export function DeleteFolderDialog({
  folder,
  itemCount,
  onClose,
}: {
  folder: FilterFolder;
  /** 直接包含的子文件夹与筛选数量 */
  itemCount: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const deleteFolder = useFilterStore((state) => state.deleteFolder);
  const [mode, setMode] = useState<DeleteFolderMode>("move_contents_up");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteFolder(folder.id, itemCount > 0 ? mode : "move_contents_up");
      onClose();
    } catch (caught) {
      setError(errorText(t, caught as CommandError));
      setDeleting(false);
    }
  }

  const choices: { value: DeleteFolderMode; label: string }[] = [
    { value: "move_contents_up", label: t("deleteFolder.moveUp") },
    { value: "delete_contents", label: t("deleteFolder.deleteAll") },
  ];

  return (
    <Dialog
      title={t("deleteFolder.title")}
      onClose={onClose}
      footer={
        <>
          <DialogButton onClick={onClose}>{t("dialog.cancel")}</DialogButton>
          <DialogButton tone="danger" disabled={deleting} onClick={handleDelete}>
            {t("dialog.delete")}
          </DialogButton>
        </>
      }
    >
      <div className="space-y-3 text-[13px]">
        <p>
          {itemCount > 0
            ? t("deleteFolder.message", folder.name, itemCount)
            : t("deleteFolder.empty", folder.name)}
        </p>
        {itemCount > 0 && (
          <div role="radiogroup" className="space-y-1.5">
            {choices.map((choice) => (
              <label
                key={choice.value}
                className={cn(
                  "flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                  mode === choice.value ? "border-brand bg-brand/5" : "border-border hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="delete-folder-mode"
                  checked={mode === choice.value}
                  onChange={() => setMode(choice.value)}
                  className="mt-0.5 accent-[hsl(var(--brand))]"
                />
                <span className={choice.value === "delete_contents" && mode === choice.value ? "text-destructive" : undefined}>
                  {choice.label}
                </span>
              </label>
            ))}
          </div>
        )}
        {error && <p className="text-[12px] text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
}
