import { useUIStore } from "@/store/uiStore";
import { ReactNode } from "react";

interface FontToolbarProps {
  children?: ReactNode;
}

export function FontToolbar({ children }: FontToolbarProps) {
  const { multiSelectMode, selectedFontIds, setMultiSelectMode } = useUIStore();
  const selectedCount = selectedFontIds.size;

  return (
    <div className="min-h-[42px] flex items-center justify-end gap-6 px-6 py-1 border-b border-border bg-background">
      {multiSelectMode ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {selectedCount} {selectedCount === 1 ? "Item" : "Items"} Selected
          </span>
          <button
            type="button"
            onClick={() => setMultiSelectMode(false)}
            className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
