import { useI18n, valueLabel } from "@/i18n";
import { formatFontWeight } from "@/lib/font";
import { useFontNames } from "@/lib/font-names";
import { openInExplorer } from "@/lib/tauri-api";
import { formatFileSize } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { FontInfo } from "@/types/font";
import { FolderOpen } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

const MIN_WIDTH = 240;
const MAX_WIDTH = 600;

/** 详情页右侧信息栏：macOS「显示简介」式的分组 + 两列键值 */
export function RightSidebar({ font }: { font: FontInfo }) {
  const { t } = useI18n();
  const { fullName } = useFontNames();
  const rightSidebarWidth = useUIStore((state) => state.rightSidebarWidth);
  const setRightSidebarWidth = useUIStore((state) => state.setRightSidebarWidth);
  const [dragWidth, setDragWidth] = useState<number | null>(null);

  // 拖动左边缘调整宽度，松开时才写入 store
  useEffect(() => {
    if (dragWidth === null) return;
    const handleMove = (event: MouseEvent) =>
      setDragWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - event.clientX)));
    const handleUp = () => {
      setRightSidebarWidth(dragWidth);
      setDragWidth(null);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragWidth, setRightSidebarWidth]);

  const metadata = [
    { label: t("meta.designer"), value: font.metadata.designer },
    { label: t("meta.manufacturer"), value: font.metadata.manufacturer },
    { label: t("meta.version"), value: font.metadata.version },
    { label: t("meta.license"), value: font.metadata.license },
    { label: t("meta.copyright"), value: font.metadata.copyright },
    { label: t("meta.trademark"), value: font.metadata.trademark },
    { label: t("meta.description"), value: font.metadata.description },
  ].filter((entry) => entry.value);

  return (
    <aside
      className="absolute top-0 right-0 bottom-0 z-30 border-l border-border bg-background overflow-y-auto"
      style={{ width: dragWidth ?? rightSidebarWidth }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-brand/40 transition-colors"
        onMouseDown={() => setDragWidth(rightSidebarWidth)}
      />

      <div className="px-4 py-5 space-y-5 text-[12px]">
        <div>
          <h2 className="text-[14px] font-semibold leading-snug break-words">{fullName(font)}</h2>
          <p className="text-muted-foreground">{font.style}</p>
        </div>

        <Section title={t("info.fileInfo")}>
          <Row label={t("info.cssFamily")}>
            <span className="break-words select-text">{font.css_font_family}</span>
          </Row>
          <Row label={t("info.path")}>
            <span className="break-all">{font.path}</span>
            <button
              type="button"
              title={t("info.openInExplorer")}
              onClick={() => openInExplorer(font.path).catch(() => {})}
              className="ml-1 inline-flex align-middle p-0.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          </Row>
          <Row label={t("info.format")}>{font.format}</Row>
          <Row label={t("info.size")}>{formatFileSize(font.file_size)}</Row>
          <Row label={t("info.weight")}>{formatFontWeight(font.weight)}</Row>
          {font.is_variable && <Row label={t("info.variableFont")}>{t("info.yes")}</Row>}
        </Section>

        {font.languages.length > 0 && (
          <Section title={t("info.languages")}>
            <Chips values={font.languages.map((language) => valueLabel(t, "language", language))} />
          </Section>
        )}

        {metadata.length > 0 && (
          <Section title={t("info.nameTable")}>
            {metadata.map((entry) => (
              <Row key={entry.label} label={entry.label}>
                <span className="break-words">{entry.value}</span>
              </Row>
            ))}
          </Section>
        )}

        {font.scripts.length > 0 && (
          <Section title={t("info.scripts")}>
            <Chips values={font.scripts} />
          </Section>
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{title}</h3>
      <dl className="space-y-1">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Chips({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <span key={value} className="px-1.5 py-0.5 rounded bg-muted text-[11px]">
          {value}
        </span>
      ))}
    </div>
  );
}
