import { useFonts } from "@/hooks/useFonts";
import { useUIStore } from "@/store/uiStore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LiHTMLAttributes } from "react";
import { useCallback } from "react";

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const { fonts } = useFonts();
  const store = useUIStore();

  const countByLanguage = useCallback((lang: string) => {
    let count = 0;
    fonts.forEach(font => {
      if (font.languages.includes(lang)) {
        count++;
      }
    });
    return count;
  }, [fonts])

  const enabled_count = useCallback(() => {
    let count = 0;
    fonts.forEach(font => {
      if (font.status !== "Disabled") {
        count++;
      }
    });
    return count
  }, [fonts])

  return (
    <aside
      className={`relative border-r border-border bg-background transition-all duration-300 ${collapsed ? 'w-0' : 'w-64'
        }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Sidebar content */}
      {!collapsed && (
        <div className="p-4 overflow-y-auto h-full">
          <nav className="space-y-6">
            {/* Categories */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Categories
              </h2>
              <ul className="space-y-1">
                <SidebarItem label="All Fonts" count={fonts.length} onClick={() => { store.setFilters({ languages: [], tags: [] }) }} />
                <SidebarItem label="Recently Added" count={0} />
                <SidebarItem label="Favorites" count={0} />
              </ul>
            </div>

            {/* Languages */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Languages
              </h2>
              <ul className="space-y-1">
                <SidebarItem label="Unknown" count={countByLanguage("Unknown")} onClick={() => { store.setFilters({ languages: ["Unknown"], tags: [] }) }} />
                <SidebarItem label="Chinese" count={countByLanguage("Chinese")} onClick={() => { store.setFilters({ languages: ["Chinese"], tags: [] }) }} />
                <SidebarItem label="English" count={countByLanguage("English")} onClick={() => { store.setFilters({ languages: ["English"], tags: [] }) }} />
                <SidebarItem label="Japanese" count={countByLanguage("Japanese")} onClick={() => { store.setFilters({ languages: ["Japanese"], tags: [] }) }} />
              </ul>
            </div>

            {/* Font Types */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Types
              </h2>
              <ul className="space-y-1">
                <SidebarItem label="Sans Serif" count={0} />
                <SidebarItem label="Serif" count={0} />
                <SidebarItem label="Monospace" count={0} />
                <SidebarItem label="Handwriting" count={0} />
              </ul>
            </div>

            {/* Status */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Status
              </h2>
              <ul className="space-y-1">
                <SidebarItem label="Enabled" count={enabled_count()} />
                <SidebarItem label="Disabled" count={fonts.length - enabled_count()} />
              </ul>
            </div>
          </nav>
        </div>
      )}
    </aside>
  );
}

interface SidebarItemProps extends React.DetailedHTMLProps<LiHTMLAttributes<HTMLLIElement>, HTMLLIElement> {
  label: string;
  count: number;
}

function SidebarItem({ label, count, ...liProps }: SidebarItemProps) {
  return (
    <li {...liProps}>
      <button className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </button>
    </li>
  );
}
