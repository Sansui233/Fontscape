import { FilterDialog } from "@/components/filter/FilterDialog";
import { DeleteFolderDialog, FolderNameDialog } from "@/components/filter/FolderDialogs";
import { SETTINGS_SHORTCUT } from "@/components/settings/SettingsDialog";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { ConfirmDialog, NameDialog } from "@/components/ui/NameDialog";
import { Dialog, DialogButton } from "@/components/ui/Dialog";
import { errorText, useI18n } from "@/i18n";
import { filterLabel, languageGlyph } from "@/lib/filter-labels";
import { isFontDrag, readFontDrag } from "@/lib/font-drag";
import { buildFolderTree, countChildren, type FolderNode } from "@/lib/folder-tree";
import { countFontFamilies, hasCriteria, sameCriteria } from "@/lib/font-filter";
import { cn } from "@/lib/utils";
import { folderSubtree, useFilterStore } from "@/store/filterStore";
import { useFontStore } from "@/store/fontStore";
import { showToast } from "@/store/toastStore";
import { familyTagNames, useTagStore } from "@/store/tagStore";
import { useUIStore } from "@/store/uiStore";
import type { CommandError } from "@/types/application";
import { EMPTY_FILTER_CRITERIA, type FilterFolder, type SavedFilter } from "@/types/filter";
import type { Tag } from "@/types/tag";
import {
  ArrowUpToLine,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  ListFilter,
  PanelLeft,
  Pencil,
  Plus,
  Settings,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import { ReactNode, useMemo, useRef, useState } from "react";

const SIDEBAR_WIDTH = 208;
/** 每一级文件夹的缩进 */
const INDENT = 12;
/** 分组内的占位行（新建筛选、暂无标签）：弱化文字，结构与普通行一致 */
const PLACEHOLDER_ROW =
  "h-[26px] flex items-center gap-2 px-2 rounded-md text-[13px] text-muted-foreground/70 transition-colors";

export function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const [peeking, setPeeking] = useState(false);
  const leaveTimer = useRef<number | null>(null);

  function startPeek() {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    setPeeking(true);
  }

  function endPeek() {
    leaveTimer.current = window.setTimeout(() => setPeeking(false), 200);
  }

  if (!collapsed) {
    return (
      <aside className="shrink-0 sidebar-enter" style={{ width: SIDEBAR_WIDTH }}>
        <SidebarContent />
      </aside>
    );
  }

  // 收起时：鼠标移到窗口左边缘，侧栏以浮层形式滑出
  return (
    <>
      <div className="absolute left-0 top-0 bottom-0 w-2 z-20" onMouseEnter={startPeek} />
      <aside
        onMouseEnter={startPeek}
        onMouseLeave={endPeek}
        className={cn(
          "absolute left-2 top-2 bottom-2 z-30 rounded-xl border border-border bg-sidebar shadow-xl transition-transform duration-200",
          peeking ? "translate-x-0" : "-translate-x-[calc(100%+12px)]"
        )}
        style={{ width: SIDEBAR_WIDTH }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

function SidebarHeader() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const { t } = useI18n();

  return (
    <div data-tauri-drag-region className="h-12 shrink-0 flex items-center gap-2 pl-4 pr-2">
      <span data-tauri-drag-region className="flex-1 text-[14px] font-semibold tracking-tight">
        {t("app.name")}
      </span>
      <button
        type="button"
        title={collapsed ? t("nav.keepSidebar") : t("nav.hideSidebar")}
        onClick={toggleSidebar}
        className="p-1.5 rounded-md text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
      >
        <PanelLeft className="w-4 h-4" />
      </button>
    </div>
  );
}

/** 侧栏展开时设置按钮放在底部；收起时由标题栏显示 */
function SidebarFooter() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);
  const { t } = useI18n();

  if (collapsed) return null;

  return (
    <div className="shrink-0 flex px-2 pb-2">
      <button
        type="button"
        title={t("settings.tooltip", SETTINGS_SHORTCUT)}
        onClick={() => setSettingsOpen(true)}
        className="p-1.5 rounded-md text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
}

/** 正在拖动的条目 */
type DragItem = { type: "filter" | "folder"; id: string };
/** 放置目标：文件夹 ID，或 null 表示「已存筛选」根目录 */
type DropTarget = string | null;

/** 当前打开的弹窗 */
type DialogState =
  | { kind: "newFilter"; folderId: string | null }
  | { kind: "editFilter"; filter: SavedFilter }
  | { kind: "deleteFilter"; filter: SavedFilter }
  | { kind: "newFolder"; parentId: string | null }
  | { kind: "renameFolder"; folder: FilterFolder }
  | { kind: "deleteFolder"; folder: FilterFolder; itemCount: number }
  | { kind: "newTag" }
  | { kind: "renameTag"; tag: Tag }
  | { kind: "deleteTag"; tag: Tag; familyCount: number };

function SidebarContent() {
  const { t } = useI18n();
  const fontState = useFontStore((state) => state.fontState);
  const filters = useFilterStore((state) => state.filters);
  const folders = useFilterStore((state) => state.folders);
  const activeFilterId = useFilterStore((state) => state.activeFilterId);
  const criteria = useFilterStore((state) => state.criteria);
  const applyFilter = useFilterStore((state) => state.applyFilter);
  const clearCriteria = useFilterStore((state) => state.clearCriteria);
  const moveFilter = useFilterStore((state) => state.moveFilter);
  const moveFolder = useFilterStore((state) => state.moveFolder);
  const setCriteria = useFilterStore((state) => state.setCriteria);
  const tags = useTagStore((state) => state.tags);
  const familyTags = useTagStore((state) => state.familyTags);

  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | undefined>(undefined);
  const [tagDropId, setTagDropId] = useState<string | null>(null);
  const setFamilyTag = useTagStore((state) => state.setFamilyTag);

  // 计数不受搜索文字影响，只反映 Filter 本身的条件
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    if (!fontState) return result;
    const tagNames = familyTagNames(tags, familyTags);
    for (const filter of filters) {
      result.set(filter.id, countFontFamilies(fontState, filter.criteria, tagNames));
    }
    return result;
  }, [fontState, filters, tags, familyTags]);

  // 每个标签下已安装的家族数
  const tagCounts = useMemo(() => {
    const installed = new Set(fontState?.css_font_families.map((family) => family.name));
    const result = new Map<string, number>();
    for (const [family, ids] of Object.entries(familyTags)) {
      if (!installed.has(family)) continue;
      for (const id of ids) result.set(id, (result.get(id) ?? 0) + 1);
    }
    return result;
  }, [fontState, familyTags]);

  // 点击标签 = 只按该标签筛选
  const isTagSelected = (tag: Tag) =>
    activeFilterId === null &&
    sameCriteria(criteria, { ...EMPTY_FILTER_CRITERIA, tag_contains: tag.name });

  const languageFilters = filters.filter((filter) => filter.group_name === "language");
  const tree = useMemo(
    () => buildFolderTree(folders, filters.filter((filter) => filter.group_name === "saved")),
    [folders, filters]
  );

  function openMenu(event: React.MouseEvent, items: ContextMenuItem[]) {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ x: event.clientX, y: event.clientY, items });
  }

  function showError(error: unknown) {
    showToast(errorText(t, error as CommandError), "error");
  }

  // ---------- 右键菜单 ----------

  const newItems = (folderId: string | null): ContextMenuItem[] => [
    {
      label: t("menu.newFilter"),
      icon: <Plus />,
      onClick: () => setDialog({ kind: "newFilter", folderId }),
    },
    {
      label: t("menu.newFolder"),
      icon: <FolderPlus />,
      onClick: () => setDialog({ kind: "newFolder", parentId: folderId }),
    },
  ];

  const filterMenu = (filter: SavedFilter): ContextMenuItem[] => [
    {
      label: t("menu.edit"),
      icon: <Pencil />,
      onClick: () => setDialog({ kind: "editFilter", filter }),
    },
    ...(filter.folder_id
      ? [{
          label: t("menu.moveToTop"),
          icon: <ArrowUpToLine />,
          onClick: () => moveFilter(filter.id, null).catch(showError),
        }]
      : []),
    {
      label: t("menu.delete"),
      icon: <Trash2 />,
      danger: true,
      onClick: () => setDialog({ kind: "deleteFilter", filter }),
    },
  ];

  const folderMenu = (node: FolderNode): ContextMenuItem[] => [
    ...newItems(node.folder.id),
    {
      label: t("menu.rename"),
      icon: <Pencil />,
      onClick: () => setDialog({ kind: "renameFolder", folder: node.folder }),
    },
    ...(node.folder.parent_id
      ? [{
          label: t("menu.moveToTop"),
          icon: <ArrowUpToLine />,
          onClick: () => moveFolder(node.folder.id, null).catch(showError),
        }]
      : []),
    {
      label: t("menu.delete"),
      icon: <Trash2 />,
      danger: true,
      onClick: () =>
        setDialog({ kind: "deleteFolder", folder: node.folder, itemCount: countChildren(node) }),
    },
  ];

  // ---------- 拖放：筛选或文件夹拖到文件夹 / 根目录 ----------

  function canDrop(target: DropTarget): boolean {
    if (!dragItem) return false;
    if (dragItem.type === "filter") {
      const filter = filters.find((item) => item.id === dragItem.id);
      return !!filter && filter.folder_id !== target;
    }
    const folder = folders.find((item) => item.id === dragItem.id);
    if (!folder || folder.parent_id === target) return false;
    // 不能拖进自身或自己的子文件夹
    return target === null || !folderSubtree(folders, folder.id).has(target);
  }

  function dropProps(target: DropTarget) {
    return {
      onDragOver: (event: React.DragEvent) => {
        if (!canDrop(target)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(target);
      },
      onDragLeave: (event: React.DragEvent) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(undefined);
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const item = dragItem;
        setDropTarget(undefined);
        setDragItem(null);
        if (!item || !canDrop(target)) return;
        const action =
          item.type === "filter" ? moveFilter(item.id, target) : moveFolder(item.id, target);
        action.catch(showError);
        // 拖进折叠的文件夹后展开，方便看到结果
        if (target) {
          setCollapsedFolders((current) => {
            const next = new Set(current);
            next.delete(target);
            return next;
          });
        }
      },
    };
  }

  function dragProps(item: DragItem) {
    return {
      draggable: true,
      onDragStart: (event: React.DragEvent) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        setDragItem(item);
      },
      onDragEnd: () => {
        setDragItem(null);
        setDropTarget(undefined);
      },
    };
  }

  // ---------- 拖放：Grid / List 的字体拖到标签 ----------

  function tagDropProps(tag: Tag) {
    return {
      dropActive: tagDropId === tag.id,
      onDragOver: (event: React.DragEvent) => {
        if (!isFontDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
        setTagDropId(tag.id);
      },
      onDragLeave: (event: React.DragEvent) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setTagDropId(null);
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setTagDropId(null);
        const families = readFontDrag(event).filter((family) => !familyTags[family]?.includes(tag.id));
        if (families.length === 0) {
          showToast(t("tagDrop.alreadyTagged", tag.name));
          return;
        }
        setFamilyTag(tag.id, families, true)
          .then(() => showToast(t("tagDrop.added", families.length, tag.name)))
          .catch(showError);
      },
    };
  }

  // ---------- 渲染 ----------

  function renderFilter(filter: SavedFilter, depth: number) {
    const isLanguage = filter.group_name === "language";
    return (
      <SidebarRow
        key={filter.id}
        depth={depth}
        icon={
          isLanguage ? (
            <span className="text-[11px] leading-none">
              {languageGlyph(filter.criteria.languages[0] ?? filter.name)}
            </span>
          ) : (
            <ListFilter className="w-3.5 h-3.5" />
          )
        }
        label={filterLabel(t, filter)}
        count={counts.get(filter.id)}
        selected={filter.id === activeFilterId}
        dimmed={dragItem?.type === "filter" && dragItem.id === filter.id}
        onClick={() => applyFilter(filter.id)}
        onContextMenu={(event) => openMenu(event, filterMenu(filter))}
        {...(isLanguage ? {} : dragProps({ type: "filter", id: filter.id }))}
      />
    );
  }

  function renderFolder(node: FolderNode, depth: number): ReactNode {
    const { folder } = node;
    const open = !collapsedFolders.has(folder.id);
    return (
      <li key={folder.id} className="list-none">
        <SidebarRow
          as="div"
          depth={depth}
          icon={open ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
          label={folder.name}
          selected={false}
          dropActive={dropTarget === folder.id}
          dimmed={dragItem?.type === "folder" && dragItem.id === folder.id}
          onClick={() =>
            setCollapsedFolders((current) => {
              const next = new Set(current);
              if (next.has(folder.id)) next.delete(folder.id);
              else next.add(folder.id);
              return next;
            })
          }
          onContextMenu={(event) => openMenu(event, folderMenu(node))}
          {...dragProps({ type: "folder", id: folder.id })}
          {...dropProps(folder.id)}
        />
        {open && (
          <ul className="space-y-px">
            {node.folders.map((child) => renderFolder(child, depth + 1))}
            {node.filters.map((filter) => renderFilter(filter, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <SidebarHeader />
      <nav className="flex-1 overflow-y-auto px-2 pb-3 select-none">
        <ul>
          <SidebarRow
            icon={<LayoutGrid className="w-3.5 h-3.5" />}
            label={t("nav.allFonts")}
            count={fontState?.css_font_families.length}
            selected={!hasCriteria(criteria)}
            onClick={clearCriteria}
          />
        </ul>

        <SidebarSection title={t("nav.languages")}>
          {languageFilters.map((filter) => renderFilter(filter, 0))}
        </SidebarSection>

        <SidebarSection
          title={t("nav.savedFilters")}
          dropActive={dropTarget === null}
          onContextMenu={(event) => openMenu(event, newItems(null))}
          headerProps={dropProps(null)}
        >
          {tree.folders.map((node) => renderFolder(node, 0))}
          {tree.filters.map((filter) => renderFilter(filter, 0))}
          <li className="list-none">
            <button
              type="button"
              onClick={() => setDialog({ kind: "newFilter", folderId: null })}
              className={cn(PLACEHOLDER_ROW, "w-full hover:bg-sidebar-hover hover:text-foreground")}
            >
              <span className="w-4 flex justify-center">
                <Plus className="w-3.5 h-3.5" />
              </span>
              {t("nav.newFilter")}
            </button>
          </li>
        </SidebarSection>

        <SidebarSection
          title={t("nav.tags")}
          onContextMenu={(event) =>
            openMenu(event, [
              {
                label: t("menu.newTag"),
                icon: <Plus />,
                onClick: () => setDialog({ kind: "newTag" }),
              },
            ])
          }
        >
          {tags.map((tag) => (
            <SidebarRow
              key={tag.id}
              icon={<TagIcon className="w-3.5 h-3.5" />}
              label={tag.name}
              count={tagCounts.get(tag.id) ?? 0}
              selected={isTagSelected(tag)}
              {...tagDropProps(tag)}
              onClick={() => setCriteria({ ...EMPTY_FILTER_CRITERIA, tag_contains: tag.name })}
              onContextMenu={(event) =>
                openMenu(event, [
                  {
                    label: t("menu.rename"),
                    icon: <Pencil />,
                    onClick: () => setDialog({ kind: "renameTag", tag }),
                  },
                  {
                    label: t("menu.delete"),
                    icon: <Trash2 />,
                    danger: true,
                    onClick: () =>
                      setDialog({ kind: "deleteTag", tag, familyCount: tagCounts.get(tag.id) ?? 0 }),
                  },
                ])
              }
            />
          ))}
          <li className="list-none">
            <button
              type="button"
              onClick={() => setDialog({ kind: "newTag" })}
              className={cn(PLACEHOLDER_ROW, "w-full hover:bg-sidebar-hover hover:text-foreground")}
            >
              <span className="w-4 flex justify-center">
                <Plus className="w-3.5 h-3.5" />
              </span>
              {t("nav.newTag")}
            </button>
          </li>
        </SidebarSection>
      </nav>
      <SidebarFooter />

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {dialog && <SidebarDialog state={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}

function SidebarDialog({ state, onClose }: { state: DialogState; onClose: () => void }) {
  switch (state.kind) {
    case "newFilter":
      return <FilterDialog mode="create" folderId={state.folderId} onClose={onClose} />;
    case "editFilter":
      return <FilterDialog mode="edit" filter={state.filter} onClose={onClose} />;
    case "deleteFilter":
      return <DeleteFilterDialog filter={state.filter} onClose={onClose} />;
    case "newFolder":
      return <FolderNameDialog mode="create" parentId={state.parentId} onClose={onClose} />;
    case "renameFolder":
      return <FolderNameDialog mode="rename" folder={state.folder} onClose={onClose} />;
    case "deleteFolder":
      return <DeleteFolderDialog folder={state.folder} itemCount={state.itemCount} onClose={onClose} />;
    case "newTag":
    case "renameTag":
    case "deleteTag":
      return <TagDialog state={state} onClose={onClose} />;
  }
}

function TagDialog({
  state,
  onClose,
}: {
  state: Extract<DialogState, { kind: "newTag" | "renameTag" | "deleteTag" }>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const createTag = useTagStore((store) => store.createTag);
  const renameTag = useTagStore((store) => store.renameTag);
  const deleteTag = useTagStore((store) => store.deleteTag);
  const criteria = useFilterStore((store) => store.criteria);
  const clearCriteria = useFilterStore((store) => store.clearCriteria);

  if (state.kind === "deleteTag") {
    return (
      <ConfirmDialog
        title={t("deleteTag.title")}
        message={t("deleteTag.message", state.tag.name, state.familyCount)}
        confirmLabel={t("dialog.delete")}
        onConfirm={async () => {
          await deleteTag(state.tag.id);
          // 正在按这个标签筛选时回到全部字体
          if (criteria.tag_contains === state.tag.name) clearCriteria();
        }}
        onClose={onClose}
      />
    );
  }
  return (
    <NameDialog
      title={state.kind === "renameTag" ? t("tagDialog.renameTitle") : t("tagDialog.newTitle")}
      initialName={state.kind === "renameTag" ? state.tag.name : ""}
      placeholder={t("tagDialog.namePlaceholder")}
      onSubmit={(name) => (state.kind === "renameTag" ? renameTag(state.tag.id, name) : createTag(name))}
      onClose={onClose}
    />
  );
}

function SidebarSection({
  title,
  children,
  dropActive,
  onContextMenu,
  headerProps,
}: {
  title: string;
  children: ReactNode;
  dropActive?: boolean;
  onContextMenu?: (event: React.MouseEvent) => void;
  /** 标题行的拖放处理：拖到标题上表示移到该分组根目录 */
  headerProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onContextMenu={onContextMenu}
        {...headerProps}
        className={cn(
          "w-full h-6 flex items-center gap-1 px-1 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-foreground",
          dropActive && "bg-brand/10 text-brand ring-1 ring-brand/40"
        )}
      >
        <ChevronRight
          className={cn("w-3 h-3 transition-transform duration-150", open && "rotate-90")}
          strokeWidth={2.5}
        />
        {title}
      </button>
      {open && <ul className="mt-0.5 pl-2.5 space-y-px">{children}</ul>}
    </section>
  );
}

interface SidebarRowProps extends Omit<React.HTMLAttributes<HTMLElement>, "onClick"> {
  icon: ReactNode;
  label: string;
  count?: number;
  selected: boolean;
  depth?: number;
  dropActive?: boolean;
  dimmed?: boolean;
  onClick: () => void;
  /** 文件夹行外层已有 <li>，用 div 渲染 */
  as?: "li" | "div";
}

function SidebarRow({
  icon,
  label,
  count,
  selected,
  depth = 0,
  dropActive,
  dimmed,
  onClick,
  as = "li",
  ...rest
}: SidebarRowProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      {...(rest as React.HTMLAttributes<HTMLButtonElement>)}
      style={{ paddingLeft: 8 + depth * INDENT }}
      className={cn(
        "w-full h-[26px] flex items-center pr-2 rounded-md text-[13px] text-left transition-colors",
        "gap-2",
        selected ? "bg-sidebar-active" : "hover:bg-sidebar-hover",
        dropActive && "bg-brand/10 ring-1 ring-brand/40",
        dimmed && "opacity-40"
      )}
    >
      <span className={cn("w-4 flex justify-center shrink-0", selected ? "text-brand" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
      )}
    </button>
  );

  return as === "li" ? <li className="list-none">{button}</li> : button;
}

function DeleteFilterDialog({ filter, onClose }: { filter: SavedFilter; onClose: () => void }) {
  const deleteFilter = useFilterStore((state) => state.deleteFilter);
  const [deleting, setDeleting] = useState(false);
  const { t } = useI18n();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteFilter(filter.id);
      onClose();
    } catch (error) {
      showToast(t("deleteDialog.failed", errorText(t, error as CommandError)), "error");
      setDeleting(false);
    }
  }

  return (
    <Dialog
      title={t("deleteDialog.title")}
      onClose={onClose}
      footer={
        <>
          <DialogButton onClick={onClose}>{t("dialog.cancel")}</DialogButton>
          <DialogButton tone="danger" disabled={deleting} onClick={handleDelete}>
            {t("dialog.delete")}
          </DialogButton>
        </>
      }
    >
      <p className="text-[13px]">
        {t("deleteDialog.message", filterLabel(t, filter))}
        {filter.group_name === "language" && (
          <span className="block mt-1 text-[12px] text-muted-foreground">
            {t("deleteDialog.presetNote")}
          </span>
        )}
      </p>
    </Dialog>
  );
}
