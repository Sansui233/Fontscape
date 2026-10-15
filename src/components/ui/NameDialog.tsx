import { errorText, useI18n } from "@/i18n";
import type { CommandError } from "@/types/application";
import { FormEvent, ReactNode, useState } from "react";
import { Dialog, DialogButton } from "./Dialog";

const MAX_NAME_LENGTH = 64;

/** 只需输入一个名称的弹窗（新建 / 重命名文件夹、标签）；失败时保留输入并显示原因 */
export function NameDialog({
  title,
  initialName = "",
  placeholder,
  onSubmit,
  onClose,
}: {
  title: string;
  initialName?: string;
  placeholder: string;
  onSubmit: (name: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && [...trimmed].length <= MAX_NAME_LENGTH && !saving;

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (caught) {
      setError(errorText(t, caught as CommandError));
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <DialogButton onClick={onClose}>{t("dialog.cancel")}</DialogButton>
          <DialogButton tone="primary" disabled={!canSave} onClick={() => handleSubmit()}>
            {saving ? t("dialog.saving") : t("dialog.save")}
          </DialogButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          autoFocus
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => setName(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          placeholder={placeholder}
          className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
        {error && <p className="text-[12px] text-destructive">{error}</p>}
      </form>
    </Dialog>
  );
}

/** 危险操作的确认弹窗 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (caught) {
      setError(errorText(t, caught as CommandError));
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <DialogButton onClick={onClose}>{t("dialog.cancel")}</DialogButton>
          <DialogButton tone="danger" disabled={busy} onClick={handleConfirm}>
            {confirmLabel}
          </DialogButton>
        </>
      }
    >
      <div className="space-y-2 text-[13px]">
        <p>{message}</p>
        {error && <p className="text-[12px] text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
}
