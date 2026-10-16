import { FilterButton } from "@/components/filter/FilterButton";
import { SETTINGS_SHORTCUT } from "@/components/settings/SettingsDialog";
import { useFilteredFamilies } from "@/hooks/useFilteredFamilies";
import { useI18n } from "@/i18n";
import { filterLabel } from "@/lib/filter-labels";
import { hasCriteria } from "@/lib/font-filter";
import { useFontNames } from "@/lib/font-names";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/store/filterStore";
import { useFontStore } from "@/store/fontStore";
import { useUIStore } from "@/store/uiStore";
import { ArrowLeft, Grid3x3, List, PanelLeft, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { PreviewField, SearchField } from "./TopbarFields";
import { WindowControls } from "./WindowControls";

/**
 * 单行统一标题栏，位于灰色窗口外框上：
 * 位置（返回 + 标题）→ 找字体（搜索、筛选）→ 看字体（预览、视图）→ 窗口按钮
 */
export function Topbar() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.state?.idx > 0);
  }, [location]);

  const isList = location.pathname === "/list";
  const isBrowsing = location.pathname === "/" || isList;

  return (
    <header data-tauri-drag-region className="h-12 shrink-0 flex items-center gap-2 pl-2">
      <SlideSlot show={sidebarCollapsed}>
        <IconButton title={t("nav.showSidebar")} onClick={toggleSidebar}>
          <PanelLeft className="h-4 w-4" />
        </IconButton>
      </SlideSlot>
      <IconButton title={t("nav.back")} onClick={() => navigate(-1)} disabled={!canGoBack}>
        <ArrowLeft className="h-4 w-4" />
      </IconButton>

      <PageTitle />

      {/* 空白处用于拖动窗口 */}
      <div data-tauri-drag-region className="flex-1 self-stretch min-w-4" />

      {isBrowsing && (
        <>
          <SearchField />
          <FilterButton />
          <PreviewField view={isList ? "list" : "grid"} />
        </>
      )}

      <div className="flex items-center p-0.5 rounded-md bg-foreground/[0.06]">
        <SegmentButton
          title={t("view.grid")}
          active={!isList}
          onClick={() => location.pathname !== "/" && navigate("/")}
        >
          <Grid3x3 className="h-4 w-4" />
        </SegmentButton>
        <SegmentButton
          title={t("view.list")}
          active={isList}
          onClick={() => !isList && navigate("/list")}
        >
          <List className="h-4 w-4" />
        </SegmentButton>
      </div>

      {/* 侧栏展开时设置按钮在侧栏底部 */}
      <SlideSlot show={sidebarCollapsed}>
        <IconButton title={t("settings.tooltip", SETTINGS_SHORTCUT)} onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4" />
        </IconButton>
      </SlideSlot>

      <WindowControls />
    </header>
  );
}

/** 浏览时显示当前 Filter 名称和数量；详情页显示字体家族名 */
function PageTitle() {
  const location = useLocation();
  const families = useFilteredFamilies();
  const criteria = useFilterStore((state) => state.criteria);
  const activeFilter = useFilterStore((state) =>
    state.filters.find((filter) => filter.id === state.activeFilterId)
  );
  const fontState = useFontStore((state) => state.fontState);
  const getFontById = useFontStore((state) => state.getFontById);
  const { familyName } = useFontNames();
  const { t } = useI18n();

  let title: string;
  let count: number | null = null;

  if (location.pathname.startsWith("/family/")) {
    const name = decodeURIComponent(location.pathname.slice("/family/".length));
    const family = fontState?.css_font_families.find((item) => item.name === name);
    const font = family && getFontById(family.default_font_id);
    title = font ? familyName(font) : name;
  } else {
    title = activeFilter
      ? filterLabel(t, activeFilter)
      : hasCriteria(criteria)
        ? t("nav.filtered")
        : t("nav.allFonts");
    count = families.length;
  }

  return (
    <div data-tauri-drag-region className="flex items-baseline gap-2 min-w-0 pl-1">
      <h1 data-tauri-drag-region className="truncate text-[14px] font-semibold">
        {title}
      </h1>
      {count !== null && (
        <span data-tauri-drag-region className="text-[12px] tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

/**
 * 按钮显示/隐藏时宽度在 0 和 32px 之间过渡，相邻按钮随之平移。
 * 隐藏时用 -ml-2 抵消 header 的 gap-2
 */
function SlideSlot({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      inert={!show}
      className={cn(
        "shrink-0 overflow-hidden transition-[width,margin,opacity] duration-200 ease-out",
        show ? "w-8 opacity-100" : "w-0 -ml-2 opacity-0"
      )}
    >
      {children}
    </div>
  );
}

function IconButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent",
        className
      )}
      {...props}
    />
  );
}

function SegmentButton({
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "w-8 h-7 flex items-center justify-center rounded-[5px] transition-colors",
        active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      {...props}
    />
  );
}
