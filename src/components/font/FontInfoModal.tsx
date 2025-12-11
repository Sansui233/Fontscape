import { formatDate, formatFileSize } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { FontInfo } from "@/types/font";
import { X } from "lucide-react";

interface FontInfoModalProps {
  font: FontInfo;
  onClose: () => void;
}

export function FontInfoModal({ font, onClose }: FontInfoModalProps) {
  const store = useUIStore()
  const displayName = (store.language === 'zh-CN' && font.family_zh) ? font.family_zh : font.family;
  console.debug("%% FontInfoModal render for font:", font);

  // Metadata entries to display
  const metadataEntries = [
    { label: "Copyright", value: font.metadata.copyright, id: 0 },
    { label: "Family Name", value: font.metadata.familyName, id: 1 },
    { label: "Subfamily Name", value: font.metadata.subfamilyName, id: 2 },
    { label: "Unique Identifier", value: font.metadata.uniqueIdentifier, id: 3 },
    { label: "Full Name", value: font.metadata.fullName, id: 4 },
    { label: "Version", value: font.metadata.version, id: 5 },
    { label: "PostScript Name", value: font.metadata.postscriptName, id: 6 },
    { label: "Trademark", value: font.metadata.trademark, id: 7 },
    { label: "Manufacturer", value: font.metadata.manufacturer, id: 8 },
    { label: "Designer", value: font.metadata.designer, id: 9 },
    { label: "Description", value: font.metadata.description, id: 10 },
    { label: "Vendor URL", value: font.metadata.vendorUrl, id: 11, isUrl: true },
    { label: "Designer URL", value: font.metadata.designerUrl, id: 12, isUrl: true },
    { label: "License", value: font.metadata.license, id: 13 },
    { label: "License URL", value: font.metadata.licenseUrl, id: 14, isUrl: true },
    { label: "Typographic Family", value: font.metadata.typographicFamily, id: 16 },
    { label: "Typographic Subfamily", value: font.metadata.typographicSubfamily, id: 17 },
    { label: "Compatible Full", value: font.metadata.compatibleFull, id: 18 },
    { label: "Sample Text", value: font.metadata.sampleText, id: 19 },
    { label: "PostScript CID", value: font.metadata.postscriptCid, id: 20 },
  ].filter(entry => entry.value); // Only show entries with values

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex-1">
            <h2 className="text-2xl font-bold" style={{ fontFamily: `"${font.family}", sans-serif` }}>
              {displayName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {font.style} • {font.format} • {formatFileSize(font.fileSize)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Preview */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Preview</h3>
            <div
              className="p-6 bg-muted/30 rounded-lg text-4xl leading-relaxed"
              style={{ fontFamily: `"${font.family}", sans-serif` }}
            >
              {displayName}
            </div>
            <div
              className="mt-3 p-4 bg-muted/30 rounded-lg text-base"
              style={{ fontFamily: `"${font.family}", sans-serif` }}
            >
              The quick brown fox jumps over the lazy dog<br />
              0123456789
            </div>
          </section>

          {/* Basic Info */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <dl className="grid grid-cols-1 gap-3">
              <InfoRow label="File Path" value={font.path} />
              <InfoRow label="Format" value={font.format} />
              <InfoRow label="File Size" value={formatFileSize(font.fileSize)} />
              <InfoRow label="Status" value={font.status} />
              <InfoRow label="Variable Font" value={font.is_variable ? "Yes" : "No"} />
              <InfoRow label="Languages" value={font.languages.join(", ")} />
              <InfoRow label="Scripts" value={font.scripts.join(", ")} />
              <InfoRow label="Added" value={formatDate(font.created_at)} />
            </dl>
          </section>

          {/* Font Metadata (Name IDs) */}
          {metadataEntries.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-3">Font Metadata (OpenType Name IDs)</h3>
              <dl className="grid grid-cols-1 gap-3">
                {metadataEntries.map((entry) => (
                  <InfoRow
                    key={entry.id}
                    label={`${entry.label} (ID ${entry.id})`}
                    value={entry.value || ""}
                    isUrl={entry.isUrl}
                  />
                ))}
              </dl>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  isUrl?: boolean;
}

function InfoRow({ label, value, isUrl }: InfoRowProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="font-medium text-muted-foreground">{label}:</dt>
      <dd className="col-span-2 break-words">
        {isUrl ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className="text-foreground">{value}</span>
        )}
      </dd>
    </div>
  );
}
