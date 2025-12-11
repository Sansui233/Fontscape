import { FontInfo } from "@/types/font";
import { FontCard } from "./FontCard";

interface FontGridProps {
  fonts: FontInfo[];
}

export function FontGrid({ fonts }: FontGridProps) {
  if (fonts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No fonts found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {fonts.map((font) => (
        <FontCard key={font.id} font={font} />
      ))}
    </div>
  );
}
