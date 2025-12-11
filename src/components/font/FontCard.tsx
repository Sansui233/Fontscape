import { useState } from "react";
import { FontInfo } from "@/types/font";
import { useUIStore } from "@/store/uiStore";
import { toggleFont } from "@/lib/tauri-api";
import { useFontStore } from "@/store/fontStore";

interface FontCardProps {
  font: FontInfo;
}

export function FontCard({ font }: FontCardProps) {
  const previewSize = useUIStore((state) => state.previewSize);
  const previewText = useUIStore((state) => state.previewText);
  const updateFontStatus = useFontStore((state) => state.updateFontStatus);
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggle() {
    if (font.status === "SystemFont") return;

    setIsToggling(true);
    try {
      const newStatus = font.status === "Enabled" ? "Disabled" : "Enabled";
      await toggleFont(font.id, newStatus === "Enabled");
      updateFontStatus(font.id, newStatus);
    } catch (error) {
      console.error("Failed to toggle font:", error);
    } finally {
      setIsToggling(false);
    }
  }

  const statusColor = {
    Enabled: "bg-green-500",
    Disabled: "bg-gray-400",
    SystemFont: "bg-blue-500",
  }[font.status];

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary">
      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        <div
          className={`h-2 w-2 rounded-full ${statusColor}`}
          title={font.status}
        />
      </div>

      {/* Font preview */}
      <div className="mb-4 overflow-hidden">
        <div
          className="transition-all"
          style={{
            fontFamily: `"${font.family}", sans-serif`,
            fontSize: `${previewSize}px`,
            lineHeight: 1.5,
          }}
        >
          {previewText}
        </div>
      </div>

      {/* Font info */}
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground truncate" title={font.fullName}>
          {font.family}
        </h3>
        <p className="text-sm text-muted-foreground">
          {font.style} • {font.format}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {font.languages.slice(0, 3).map((lang) => (
            <span
              key={lang}
              className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      {/* Toggle button */}
      {font.status !== "SystemFont" && (
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`mt-4 w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            font.status === "Enabled"
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isToggling
            ? "Processing..."
            : font.status === "Enabled"
            ? "Disable"
            : "Enable"}
        </button>
      )}
    </div>
  );
}
