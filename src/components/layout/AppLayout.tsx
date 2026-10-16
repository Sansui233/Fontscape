import { Toaster } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  return (
    // L 形框架：侧栏与标题栏共用半透明外框（透出 Acrylic），内容是嵌入的白色面板
    <div className="flex h-screen overflow-hidden relative bg-frame">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main
          className={cn(
            "flex-1 overflow-hidden bg-background relative border-t border-border",
            !sidebarCollapsed && "border-l rounded-tl-xl"
          )}
        >
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
