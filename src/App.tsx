import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { SettingsDialog } from "./components/settings/SettingsDialog";
import { useBootstrap } from "./hooks/useBootstrap";
import { useTheme } from "./hooks/useTheme";
import { useDocumentLocale, useI18n } from "./i18n";
import { resetDatabase } from "./lib/tauri-api";
import type { CommandError } from "./types/application";
import { useFontStore } from "./store/fontStore";
import { useUIStore } from "./store/uiStore";

function App() {
  const { status, retry } = useBootstrap();
  const { t } = useI18n();
  useTheme();
  useDocumentLocale();

  useEffect(() => {
    document.title = "Fontscape";
  }, []);

  // Filter 与设置恢复完成前不展示可操作的界面
  if (status.state === "loading") {
    return (
      <FullScreen>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
        <p className="mt-3 text-[13px] text-muted-foreground">{t("app.loading")}</p>
      </FullScreen>
    );
  }

  if (status.state === "error") {
    return (
      <FullScreen>
        <p className="text-[14px] font-semibold">{t("app.startFailed")}</p>
        <p className="mt-1 max-w-md text-center text-[13px] text-muted-foreground">
          {status.error.message}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={retry}
            className="h-7 px-3 rounded-md bg-brand text-brand-foreground text-[13px] font-medium"
          >
            {t("app.tryAgain")}
          </button>
          {status.error.code === "database_unavailable" && <ResetDatabaseButton onReset={retry} />}
        </div>
      </FullScreen>
    );
  }

  return <ReadyApp />;
}

function ReadyApp() {
  const fontState = useFontStore((state) => state.fontState);
  const viewMode = useUIStore((state) => state.viewMode);
  const setViewMode = useUIStore((state) => state.setViewMode);
  const location = useLocation();
  const navigate = useNavigate();
  const restored = useRef(false);
  const settingsOpen = useUIStore((state) => state.settingsOpen);
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);

  // Ctrl/⌘ + , 打开设置
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        setSettingsOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSettingsOpen]);

  // 首次进入时恢复上次的 Grid/List 视图
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (viewMode === "list" && location.pathname === "/") {
      navigate("/list", { replace: true });
    }
  }, [viewMode, location.pathname, navigate]);

  // 之后视图模式跟随路由
  useEffect(() => {
    if (location.pathname === "/") setViewMode("grid");
    if (location.pathname === "/list") setViewMode("list");
  }, [location.pathname, setViewMode]);

  return (
    <AppLayout>
      <Outlet context={{ fontState }} />
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </AppLayout>
  );
}

/** 数据库无法打开时的恢复入口：备份原文件后新建 */
function ResetDatabaseButton({ onReset }: { onReset: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const { t } = useI18n();

  async function handleReset() {
    if (!window.confirm(t("app.resetConfirm"))) {
      return;
    }
    try {
      await resetDatabase();
      onReset();
    } catch (error) {
      setMessage((error as CommandError).message);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleReset}
        className="h-7 px-3 rounded-md border border-border text-[13px] hover:bg-muted"
      >
        {t("app.resetDatabase")}
      </button>
      {message && <p className="text-[12px] text-destructive">{message}</p>}
    </>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="h-screen flex flex-col items-center justify-center bg-frame">{children}</div>;
}

export default App;
