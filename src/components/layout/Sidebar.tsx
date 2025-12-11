import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <aside
      className={`relative border-r border-border bg-background transition-all duration-300 ${
        collapsed ? 'w-0' : 'w-64'
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
                <SidebarItem label="All Fonts" count={156} />
                <SidebarItem label="Recently Added" count={12} />
                <SidebarItem label="Favorites" count={8} />
              </ul>
            </div>

            {/* Languages */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Languages
              </h2>
              <ul className="space-y-1">
                <SidebarItem label="Chinese" count={45} />
                <SidebarItem label="English" count={98} />
                <SidebarItem label="Japanese" count={23} />
              </ul>
            </div>

            {/* Font Types */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Types
              </h2>
              <ul className="space-y-1">
                <SidebarItem label="Sans Serif" count={67} />
                <SidebarItem label="Serif" count={34} />
                <SidebarItem label="Monospace" count={12} />
                <SidebarItem label="Handwriting" count={18} />
              </ul>
            </div>

            {/* Status */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Status
              </h2>
              <ul className="space-y-1">
                <SidebarItem label="Enabled" count={142} />
                <SidebarItem label="Disabled" count={14} />
              </ul>
            </div>
          </nav>
        </div>
      )}
    </aside>
  );
}

interface SidebarItemProps {
  label: string;
  count: number;
}

function SidebarItem({ label, count }: SidebarItemProps) {
  return (
    <li>
      <button className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </button>
    </li>
  );
}
