import { FontInfo } from "@/types/font";
import { FileText, Folder, Info, ExternalLink } from "lucide-react";
import { openInExplorer } from "@/lib/tauri-api";
import { useUIStore } from "@/store/uiStore";
import { useState, useRef, useEffect } from "react";

interface RightSidebarProps {
  font: FontInfo | null;
}

export function RightSidebar({ font }: RightSidebarProps) {
  const { rightSidebarWidth, setRightSidebarWidth } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);
  const [tempWidth, setTempWidth] = useState(rightSidebarWidth);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 240px and 600px
      const constrainedWidth = Math.max(240, Math.min(600, newWidth));
      setTempWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Update store only when resizing ends
      setRightSidebarWidth(tempWidth);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, tempWidth, setRightSidebarWidth]);
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
      ref={sidebarRef}
      className="absolute top-0 right-0 bottom-0 bg-card border-l border-border z-30 overflow-y-auto"
      style={{ width: `${isResizing ? tempWidth : rightSidebarWidth}px` }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />
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
          <div className="text-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground">Path: </span>
                <span className="text-foreground break-all" title={font.path}>
                  {formatPath(font.path)}
                </span>
              </div>
              <button
                onClick={() => openInExplorer(font.path)}
                className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
                title="Open in Explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
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
            <div className="text-sm space-y-2">
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
            <div className="flex flex-wrap gap-1">
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
            <div className="flex flex-wrap gap-1">
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
