import { StackItem } from "@/components/ui/StackItem";
import { useI18n } from "@/i18n";
import { diffFontFiles } from "@/lib/font";
import { useFontStore } from "@/store/fontStore";
import type { FontChanges } from "@/types/font";
import { RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/** 后台发现字体目录变化时，在通知栈最上方提示用户刷新 */
export function FontChangesNotice() {
  const { t } = useI18n();
  const fontState = useFontStore((state) => state.fontState);
  const pendingState = useFontStore((state) => state.pendingState);
  const setFontState = useFontStore((state) => state.setFontState);
  const setPendingState = useFontStore((state) => state.setPendingState);
  // 与界面当前数据对比，多次推送也总是相对界面计数
  const changes = useMemo(
    () => (fontState && pendingState ? diffFontFiles(fontState, pendingState) : null),
    [fontState, pendingState]
  );
  const visible = !!changes && changes.added + changes.modified + changes.removed > 0;

  // 离开动画期间继续显示最后一次的计数
  const shown = useRef<FontChanges | null>(null);
  if (visible) shown.current = changes;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  if (!mounted || !shown.current) return null;
  const { added, modified, removed } = shown.current;

  return (
    <StackItem open={visible} onExited={() => setMounted(false)}>
      <div
        role="status"
        className="flex items-start gap-2 max-w-[280px] rounded-lg border border-border bg-popover px-3 py-2 text-[13px] shadow-sm"
      >
        <div className="flex-1 space-y-2">
          <p>{t("fontChanges.found", added, modified, removed)}</p>
          <button
            type="button"
            onClick={() => pendingState && setFontState(pendingState)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-medium bg-primary text-primary-foreground hover:opacity-90"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("fontChanges.refresh")}
          </button>
        </div>
        <button
          type="button"
          title={t("fontChanges.dismiss")}
          onClick={() => setPendingState(null)}
          className="opacity-60 hover:opacity-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </StackItem>
  );
}
