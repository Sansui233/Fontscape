import { Search, Grid3x3, List, Settings } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export function Topbar() {
  const { viewMode, setViewMode } = useUIStore();

  return (
    <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
      {/* Logo and title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">FM</span>
        </div>
        <h1 className="text-lg font-semibold">Font Manager</h1>
      </div>

      {/* Search bar */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search fonts..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-background shadow-sm'
                : 'hover:bg-background/50'
            }`}
            title="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-background shadow-sm'
                : 'hover:bg-background/50'
            }`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Settings */}
        <button
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
