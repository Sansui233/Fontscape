import { errorText, useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useFontStore } from "@/store/fontStore";
import { showToast } from "@/store/toastStore";
import type { CommandError } from "@/types/application";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";

/** 后台发现字体目录变化时，在右上角（标题栏下方）提示用户刷新 */
export function FontChangesNotice() {
  const { t } = useI18n();
  const changes = useFontStore((state) => state.pendingChanges);
  const setPendingChanges = useFontStore((state) => state.setPendingChanges);
  const refresh = useFontStore((state) => state.refresh);
  const [refreshing, setRefreshing] = useState(false);

  if (!changes) return null;

  async function apply() {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      showToast(t("settings.rescanFailed", errorText(t, error as CommandError)), "error");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div
      role="status"
      className="fixed top-14 right-4 z-[60] flex items-center gap-3 w-[min(420px,calc(100vw-32px))] rounded-lg border border-border bg-popover px-3 py-2 text-[13px] shadow-lg"
    >
      <span className="flex-1">{t("fontChanges.found", changes.added, changes.modified, changes.removed)}</span>
      <button
        type="button"
        onClick={apply}
        disabled={refreshing}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
        {t("fontChanges.refresh")}
      </button>
      <button
        type="button"
        title={t("fontChanges.dismiss")}
        onClick={() => setPendingChanges(null)}
        className="opacity-60 hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
