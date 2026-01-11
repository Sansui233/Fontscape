import { useFonts } from "@/hooks/useFonts";
import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LiHTMLAttributes } from "react";
import { useCallback, useRef, useState } from "react";

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const { fontState } = useFonts();
  const uiStore = useUIStore();
  const { getFontById } = useFontStore();
  const [isHovered, setIsHovered] = useState(false);
  const leaveTimeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (collapsed) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!collapsed) return;
    leaveTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  const countByLanguage = useCallback(
    (lang: string) => {
      if (!fontState) {
        return 0;
      }
      let count = 0;
      fontState.css_font_families.forEach((fm) => {
        const font = getFontById(fm.default_font_id);
        if (font && font.languages.includes(lang)) {
          count++;
        }
      });
      return count;
    },
    [fontState]
  );

  const enabled_count = useCallback(() => {
    if (!fontState) {
      return 0;
    }
    let count = 0;
    fontState.fonts.forEach((font) => {
      if (font.status !== "Disabled") {
        count++;
      }
    });
    return count;
  }, [fontState]);

  return (
    <div
      className="relative border-r border-border"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hover trigger when collapsed */}
      {collapsed && (
        <div
          className="absolute top-2 bottom-2 w-8 z-3 transition-all duration-300"
          style={{
            left: isHovered ? "calc(256px)" : "0",
          }}
        />
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute top-8 z-19 h-6 w-6 rounded-full border border-border bg-background shadow-sm flex items-center justify-center hover:bg-muted transition-all duration-300"
        style={{
          left: collapsed
            ? isHovered
              ? "calc(192px - 12px)"
              : "-12px"
            : "calc(192px - 12px)",
        }}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        style={{ height: collapsed ? "calc(100% - 1rem)" : "auto" }}
        className={`bg-background transition-all duration-300 overflow-hidden ${
          collapsed
            ? `border-r border-border absolute left-0 top-2 bottom-0 z-4 rounded-2xl shadow-lg ${
                isHovered ? "w-48" : "w-0"
              }`
            : "relative z-4 w-48"
        }`}
      >
        {/* Inner content with opacity transition */}
        <div
          className={`w-48 h-full transition-opacity duration-300 ${
            collapsed
              ? isHovered
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
              : "opacity-100"
          }`}
        >
          {/* Sidebar content - always rendered for smooth transition */}
          <div className="p-4 overflow-y-auto h-full">
            <nav className="space-y-6">
              {/* Categories */}
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Categories
                </h2>
                <ul className="space-y-1">
                  <SidebarItem
                    label="All Fonts"
                    count={fontState?.css_font_families.length || 0}
                    onClick={() => {
                      uiStore.setFilters({
                        languages: [],
                        tags: [],
                        searchText: uiStore.filters.searchText,
                      });
                    }}
                  />
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
                  <SidebarItem
                    label="Unknown"
                    count={countByLanguage("Unknown")}
                    onClick={() => {
                      uiStore.setFilters({
                        languages: ["Unknown"],
                        tags: [],
                        searchText: uiStore.filters.searchText,
                      });
                    }}
                  />
                  <SidebarItem
                    label="Chinese"
                    count={countByLanguage("Chinese")}
                    onClick={() => {
                      uiStore.setFilters({
                        languages: ["Chinese"],
                        tags: [],
                        searchText: uiStore.filters.searchText,
                      });
                    }}
                  />
                  <SidebarItem
                    label="English"
                    count={countByLanguage("English")}
                    onClick={() => {
                      uiStore.setFilters({
                        languages: ["English"],
                        tags: [],
                        searchText: uiStore.filters.searchText,
                      });
                    }}
                  />
                  <SidebarItem
                    label="Japanese"
                    count={countByLanguage("Japanese")}
                    onClick={() => {
                      uiStore.setFilters({
                        languages: ["Japanese"],
                        tags: [],
                        searchText: uiStore.filters.searchText,
                      });
                    }}
                  />
                </ul>
              </div>

              {/* Status */}
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Status
                </h2>
                <ul className="space-y-1">
                  <SidebarItem label="Enabled" count={enabled_count()} />
                  <SidebarItem
                    label="Disabled"
                    count={
                      fontState ? fontState.fonts.length - enabled_count() : 0
                    }
                  />
                </ul>
              </div>
            </nav>
          </div>
        </div>
      </aside>
    </div>
  );
}

interface SidebarItemProps
  extends React.DetailedHTMLProps<
    LiHTMLAttributes<HTMLLIElement>,
    HTMLLIElement
  > {
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
