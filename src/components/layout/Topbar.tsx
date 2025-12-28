import { debounceWithCallbackRef } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { Grid3x3, List, Search, Settings, Type } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export function Topbar() {
  const { viewMode, setViewMode, previewText, setPreviewText } = useUIStore();
  const store = useUIStore();
  const appName = 'Fontscape';

  const debouncedSetSearch = useRef(
    debounceWithCallbackRef((text: string) => {
      store.setFilters({
        languages: store.filters.languages,
        tags: store.filters.tags,
        searchText: text,
      });
    }, 300)
  ).current;

  const debouncedSetPreview = useRef(
    debounceWithCallbackRef((text: string) => {
      setPreviewText(text);
    }, 500)
  ).current;

  // 保证 callback 永远最新
  useEffect(() => {
    debouncedSetSearch.callbackRef.current = (text: string) => {
      store.setFilters({
        languages: store.filters.languages,
        tags: store.filters.tags,
        searchText: text,
      });
    };

    debouncedSetPreview.callbackRef.current = (text: string) => {
      setPreviewText(text);
    };
  });

  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const searchText = e.currentTarget.value;
      debouncedSetSearch(searchText);
    },
    []
  );

  const handlePreviewInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const previewText = e.currentTarget.value;
      debouncedSetPreview(previewText);
    },
    []
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        // Execute search immediately on Enter
        const searchText = e.currentTarget.value;
        store.setFilters({
          languages: store.filters.languages,
          tags: store.filters.tags,
          searchText,
        });
      }
    },
    [store.filters]
  );

  const handlePreviewKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        // Update preview immediately on Enter
        const text = e.currentTarget.value;
        setPreviewText(text);
      }
    },
    [setPreviewText]
  );

  return (
    <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between gap-4">
      {/* Logo and title */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">FM</span>
        </div>
        <h1 className="text-lg font-semibold">{appName}</h1>
      </div>

      {/* Search and Preview inputs */}
      <div className="flex-1 flex items-center gap-4 max-w-3xl">
        {/* Search bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search fonts..."
            onChange={handleSearchInput}
            onKeyDown={handleSearchKeyDown}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Preview text input */}
        <div className="flex-1 relative">
          <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Preview text..."
            defaultValue={previewText}
            onChange={handlePreviewInput}
            onKeyDown={handlePreviewKeyDown}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${viewMode === 'grid'
              ? 'bg-background shadow-sm'
              : 'hover:bg-background/50'
              }`}
            title="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${viewMode === 'list'
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
