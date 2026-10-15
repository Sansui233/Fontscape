import { useI18n, valueLabel } from "@/i18n";
import { formatFontWeight } from "@/lib/font";
import { useFontNames } from "@/lib/font-names";
import { formatDate, formatFileSize } from "@/lib/utils";
import { FontInfo } from "@/types/font";
import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface FontInfoModalProps {
  font: FontInfo;
  onClose: () => void;
}

export function FontInfoModal({ font, onClose }: FontInfoModalProps) {
  const { t } = useI18n();
  const { familyName } = useFontNames();
  const displayName = familyName(font);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // OpenType Name ID 0–20（ID 15 保留未用）
  const metadataEntries = [
    { label: t("meta.copyright"), value: font.metadata.copyright, id: 0 },
    { label: t("meta.familyName"), value: font.metadata.family_name, id: 1 },
    { label: t("meta.subfamilyName"), value: font.metadata.subfamily_name, id: 2 },
    { label: t("meta.uniqueId"), value: font.metadata.unique_identifier, id: 3 },
    { label: t("meta.fullName"), value: font.metadata.full_name, id: 4 },
    { label: t("meta.version"), value: font.metadata.version, id: 5 },
    { label: t("meta.postscriptName"), value: font.metadata.postscript_name, id: 6 },
    { label: t("meta.trademark"), value: font.metadata.trademark, id: 7 },
    { label: t("meta.manufacturer"), value: font.metadata.manufacturer, id: 8 },
    { label: t("meta.designer"), value: font.metadata.designer, id: 9 },
    { label: t("meta.description"), value: font.metadata.description, id: 10 },
    { label: t("meta.vendorUrl"), value: font.metadata.vendor_url, id: 11, isUrl: true },
    { label: t("meta.designerUrl"), value: font.metadata.designer_url, id: 12, isUrl: true },
    { label: t("meta.license"), value: font.metadata.license, id: 13 },
    { label: t("meta.licenseUrl"), value: font.metadata.license_url, id: 14, isUrl: true },
    { label: t("meta.typographicFamily"), value: font.metadata.typographic_family, id: 16 },
    { label: t("meta.typographicSubfamily"), value: font.metadata.typographic_subfamily, id: 17 },
    { label: t("meta.compatibleFull"), value: font.metadata.compatible_full, id: 18 },
    { label: t("meta.sampleText"), value: font.metadata.sample_text, id: 19 },
    { label: t("meta.postscriptCid"), value: font.metadata.postscript_cid, id: 20 },
  ].filter((entry) => entry.value);

  const fontStyle = { fontFamily: `"${font.css_font_family}", sans-serif`, fontWeight: font.weight };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" onMouseDown={onClose}>
      <div
        className="bg-popover border border-border rounded-xl shadow-2xl w-[min(720px,calc(100vw-32px))] max-h-[88vh] flex flex-col"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-semibold truncate" style={fontStyle}>
              {displayName}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {font.style} · {font.format} · {formatFileSize(font.file_size)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t("info.close")}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-[13px]">
          <section className="rounded-lg bg-muted/40 px-4 py-3 space-y-1" style={fontStyle}>
            <div className="text-[32px] leading-tight">{displayName}</div>
            <div className="text-[15px]">The quick brown fox jumps over the lazy dog 0123456789</div>
          </section>

          <Section title={t("info.basic")}>
            <InfoRow label={t("info.cssFamily")} value={font.css_font_family} />
            <InfoRow label={t("info.weight")} value={formatFontWeight(font.weight)} />
            <InfoRow label={t("info.filePath")} value={font.path} />
            <InfoRow label={t("info.format")} value={font.format} />
            <InfoRow label={t("info.fileSize")} value={formatFileSize(font.file_size)} />
            <InfoRow label={t("info.status")} value={valueLabel(t, "status", font.status)} />
            <InfoRow label={t("info.variableFont")} value={font.is_variable ? t("info.yes") : t("info.no")} />
            <InfoRow
              label={t("info.languages")}
              value={font.languages.map((value) => valueLabel(t, "language", value)).join(", ")}
            />
            <InfoRow label={t("info.scripts")} value={font.scripts.join(", ")} />
            <InfoRow label={t("info.scanned")} value={formatDate(font.created_at)} />
          </Section>

          {metadataEntries.length > 0 && (
            <Section title={t("info.metadataTitle")}>
              {metadataEntries.map((entry) => (
                <InfoRow
                  key={entry.id}
                  label={`${entry.label} (${entry.id})`}
                  value={entry.value || ""}
                  isUrl={entry.isUrl}
                />
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold text-muted-foreground">{title}</h3>
      <dl className="space-y-1.5">{children}</dl>
    </section>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  isUrl?: boolean;
}

function InfoRow({ label, value, isUrl }: InfoRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">
        {isUrl ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
