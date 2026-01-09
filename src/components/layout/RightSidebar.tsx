import { FontInfo } from "@/types/font";
import { FileText, Folder, Info } from "lucide-react";

interface RightSidebarProps {
  font: FontInfo | null;
}

export function RightSidebar({ font }: RightSidebarProps) {
  // 只在 Modal 打开时显示

  if (!font) {
    return null;
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 格式化路径（截断过长路径）
  const formatPath = (path: string) => {
    if (path.length <= 50) return path;
    const parts = path.split(/[/\\]/);
    if (parts.length <= 3) return path;
    return `${parts[0]}\\...\\${parts.slice(-2).join("\\")}`;
  };

  // Name Table 元数据条目
  const metadataEntries = [
    { label: "Copyright", value: font.metadata.copyright },
    { label: "Designer", value: font.metadata.designer },
    { label: "Manufacturer", value: font.metadata.manufacturer },
    { label: "Version", value: font.metadata.version },
    { label: "License", value: font.metadata.license },
    { label: "Description", value: font.metadata.description },
    { label: "Trademark", value: font.metadata.trademark },
  ].filter((entry) => entry.value);

  return (
    <div
      className={`
        absolute top-0 right-0 bottom-0 w-80 bg-card border-l border-border
        transform transition-transform duration-300 ease-in-out z-30
        overflow-y-auto
      `}
    >
      <div className="p-6 space-y-6">
        {/* 标题 */}
        <div>
          <h2
            className="text-lg font-semibold text-foreground truncate"
            title={font.full_name}
          >
            {font.full_name}
          </h2>
          <p className="text-sm text-muted-foreground">{font.style}</p>
        </div>

        {/* 文件信息 */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Folder className="w-4 h-4" />
            File Info
          </h3>
          <div className="text-sm space-y-2 pl-6">
            <div>
              <span className="text-muted-foreground">Path: </span>
              <span className="text-foreground break-all" title={font.path}>
                {formatPath(font.path)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Format: </span>
              <span className="text-foreground">{font.format}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Size: </span>
              <span className="text-foreground">
                {formatFileSize(font.fileSize)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Weight: </span>
              <span className="text-foreground">{font.weight}</span>
            </div>
            {font.is_variable && (
              <div>
                <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs">
                  Variable Font
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Name Table 信息 */}
        {metadataEntries.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Name Table
            </h3>
            <div className="text-sm space-y-2 pl-6">
              {metadataEntries.map((entry, idx) => (
                <div key={idx}>
                  <span className="text-muted-foreground">{entry.label}: </span>
                  <span className="text-foreground break-words">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 语言支持 */}
        {font.languages.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Info className="w-4 h-4" />
              Languages
            </h3>
            <div className="flex flex-wrap gap-1 pl-6">
              {font.languages.map((lang) => (
                <span
                  key={lang}
                  className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Scripts */}
        {font.scripts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Scripts</h3>
            <div className="flex flex-wrap gap-1 pl-6">
              {font.scripts.map((script) => (
                <span
                  key={script}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {script}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
