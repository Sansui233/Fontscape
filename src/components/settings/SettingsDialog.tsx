import { Dialog } from "@/components/ui/Dialog";
import { errorText, LOCALE_OPTIONS, useI18n } from "@/i18n";
import { getAppInfo, openInExplorer, refreshFonts, resetDatabase } from "@/lib/tauri-api";
import { cn } from "@/lib/utils";
import { useFontStore } from "@/store/fontStore";
import { showToast } from "@/store/toastStore";
import { useUIStore } from "@/store/uiStore";
import type { AppInfo, CommandError, FontNameMode, Theme } from "@/types/application";
import { FolderOpen, Monitor, Moon, RefreshCw, Sun } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

const isMac = navigator.userAgent.includes("Mac");
export const SETTINGS_SHORTCUT = isMac ? "⌘ ," : "Ctrl + ,";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    getAppInfo().then(setInfo).catch(() => {});
  }, []);

  return (
    <Dialog title={t("settings.title")} onClose={onClose} className="w-[min(560px,calc(100vw-32px))]">
      <div className="max-h-[70vh] overflow-y-auto -mx-5 px-5 space-y-5 pb-1">
        <GeneralSection />
        <LibrarySection info={info} />
        <DataSection info={info} />
        <Section title={t("settings.shortcuts")}>
          <Row label={t("settings.openSettings")}>
            <Kbd>{SETTINGS_SHORTCUT}</Kbd>
          </Row>
          <Row label={t("settings.closeDialog")}>
            <Kbd>Esc</Kbd>
          </Row>
        </Section>
        <Section title={t("settings.about")}>
          <Row label={t("app.name")}>
            <span className="tabular-nums text-muted-foreground">
              {t("settings.version", info?.version ?? "…")}
            </span>
          </Row>
          <Row label={t("settings.schema")}>
            <span className="tabular-nums text-muted-foreground">v{info?.schema_version ?? "…"}</span>
          </Row>
        </Section>
      </div>
    </Dialog>
  );
}

function GeneralSection() {
  const { t } = useI18n();
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const fontNames = useUIStore((state) => state.fontNames);
  const setFontNames = useUIStore((state) => state.setFontNames);

  return (
    <Section title={t("settings.general")}>
      <Row label={t("settings.interfaceLanguage")}>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="h-7 pl-2 pr-7 rounded-md border border-border bg-background text-[12px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          <option value="system">{t("settings.languageSystem")}</option>
          {LOCALE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Row>
      <Row label={t("settings.appearance")}>
        <Segmented<Theme>
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: t("settings.themeSystem"), icon: <Monitor className="w-3.5 h-3.5" /> },
            { value: "light", label: t("settings.themeLight"), icon: <Sun className="w-3.5 h-3.5" /> },
            { value: "dark", label: t("settings.themeDark"), icon: <Moon className="w-3.5 h-3.5" /> },
          ]}
        />
      </Row>
      <Row label={t("settings.fontNames")} hint={t("settings.fontNamesHint")}>
        <Segmented<FontNameMode>
          value={fontNames}
          onChange={setFontNames}
          options={[
            { value: "localized", label: t("settings.fontNamesLocalized") },
            { value: "english", label: t("settings.fontNamesEnglish") },
          ]}
        />
      </Row>
    </Section>
  );
}

function LibrarySection({ info }: { info: AppInfo | null }) {
  const { t } = useI18n();
  const fontState = useFontStore((state) => state.fontState);
  const setFontState = useFontStore((state) => state.setFontState);
  const [scanning, setScanning] = useState(false);

  async function rescan() {
    setScanning(true);
    try {
      const state = await refreshFonts();
      setFontState(state);
      showToast(t("settings.rescanDone", state.css_font_families.length));
    } catch (error) {
      showToast(t("settings.rescanFailed", errorText(t, error as CommandError)), "error");
    } finally {
      setScanning(false);
    }
  }

  return (
    <Section title={t("settings.library")}>
      <Row
        label={t("settings.installedFonts")}
        hint={t(
          "settings.installedFontsHint",
          fontState?.fonts.length ?? 0,
          fontState?.css_font_families.length ?? 0
        )}
      >
        <ActionButton onClick={rescan} disabled={scanning}>
          <RefreshCw className={cn("w-3.5 h-3.5", scanning && "animate-spin")} />
          {scanning ? t("settings.scanning") : t("settings.rescan")}
        </ActionButton>
      </Row>
      <Row label={t("settings.fontFolders")} stacked>
        <ul className="space-y-0.5">
          {info?.font_directories.map((dir) => (
            <li key={dir} className="font-mono text-[11px] text-muted-foreground break-all">
              {dir}
            </li>
          ))}
        </ul>
      </Row>
    </Section>
  );
}

function DataSection({ info }: { info: AppInfo | null }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  // 二次确认：3 秒内再次点击才执行
  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  async function reset() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setResetting(true);
    try {
      await resetDatabase();
      // 重新走一遍启动流程，加载默认 Filter 与设置
      window.location.reload();
    } catch (error) {
      showToast(t("settings.resetFailed", errorText(t, error as CommandError)), "error");
      setResetting(false);
      setConfirming(false);
    }
  }

  return (
    <Section title={t("settings.data")}>
      <Row label={t("settings.database")} stacked>
        <div className="flex items-center gap-2">
          <span className="flex-1 min-w-0 font-mono text-[11px] text-muted-foreground break-all">
            {info?.database_path ?? "…"}
          </span>
          {info && (
            <ActionButton onClick={() => openInExplorer(info.database_path).catch(() => {})}>
              <FolderOpen className="w-3.5 h-3.5" />
              {t("settings.show")}
            </ActionButton>
          )}
        </div>
      </Row>
      <Row label={t("settings.resetDatabase")} hint={t("settings.resetHint")}>
        <ActionButton danger={confirming} onClick={reset} disabled={resetting}>
          {resetting
            ? t("settings.resetting")
            : confirming
              ? t("settings.confirmReset")
              : t("settings.reset")}
        </ActionButton>
      </Row>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 px-1 text-[11px] font-semibold text-muted-foreground">{title}</h3>
      <div className="rounded-lg border border-border divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  stacked,
  children,
}: {
  label: string;
  hint?: string;
  stacked?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("px-3 py-2.5", stacked ? "space-y-1.5" : "flex items-center gap-4")}>
      <div className="flex-1 min-w-0">
        <div className="text-[13px]">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      {/* 右侧控件统一使用 12px，避免继承浏览器默认 16px */}
      <div className={cn("text-[12px]", !stacked && "shrink-0")}>{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
}) {
  return (
    <div className="flex p-0.5 rounded-md bg-muted">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-6 px-2.5 flex items-center gap-1.5 rounded-[5px] text-[12px] whitespace-nowrap transition-colors",
            value === option.value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ActionButton({
  danger,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "h-7 px-2.5 flex items-center gap-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors disabled:opacity-50",
        danger
          ? "bg-destructive text-destructive-foreground"
          : "border border-border bg-background hover:bg-muted",
        className
      )}
      {...props}
    />
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-sans text-[11px] text-muted-foreground">
      {children}
    </kbd>
  );
}
