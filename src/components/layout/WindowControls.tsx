import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const isWindows = navigator.userAgent.includes("Windows");
/** 与系统一致：悬停约半秒后弹出分屏布局 */
const SNAP_HOVER_DELAY_MS = 500;

/** 去掉原生标题栏后的窗口按钮，外观与标题栏其他图标按钮保持一致 */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  const snapTimer = useRef<number | undefined>(undefined);
  const appWindow = getCurrentWindow();
  const { t } = useI18n();

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const sync = () => appWindow.isMaximized().then(setMaximized).catch(() => {});

    sync();
    appWindow.onResized(sync).then((dispose) => {
      unlisten = dispose;
    });
    return () => unlisten?.();
  }, [appWindow]);

  function scheduleSnapLayouts() {
    if (!isWindows) return;
    snapTimer.current = window.setTimeout(() => {
      invoke("show_snap_layouts").catch(() => {});
    }, SNAP_HOVER_DELAY_MS);
  }

  function cancelSnapLayouts() {
    window.clearTimeout(snapTimer.current);
  }

  return (
    <div className="flex items-center gap-0.5 ml-1 pl-2 pr-2 border-l border-foreground/10">
      <ControlButton title={t("window.minimize")} onClick={() => appWindow.minimize()}>
        <Minus className="w-4 h-4" strokeWidth={1.75} />
      </ControlButton>
      <ControlButton
        title={maximized ? t("window.restore") : t("window.maximize")}
        onClick={() => {
          cancelSnapLayouts();
          appWindow.toggleMaximize();
        }}
        onMouseEnter={scheduleSnapLayouts}
        onMouseLeave={cancelSnapLayouts}
      >
        {maximized ? (
          <Copy className="w-3.5 h-3.5 -scale-x-100" strokeWidth={1.75} />
        ) : (
          <Square className="w-3.5 h-3.5" strokeWidth={1.75} />
        )}
      </ControlButton>
      <ControlButton title={t("window.close")} danger onClick={() => appWindow.close()}>
        <X className="w-4 h-4" strokeWidth={1.75} />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  danger,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground transition-colors",
        danger
          ? "hover:bg-[#e81123] hover:text-white"
          : "hover:bg-foreground/[0.06] hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}
