import type { FilterFolder, SavedFilter } from "@/types/filter";

export interface FolderNode {
  folder: FilterFolder;
  folders: FolderNode[];
  filters: SavedFilter[];
}

export interface FolderTree {
  /** 根目录下的文件夹 */
  folders: FolderNode[];
  /** 根目录下的筛选 */
  filters: SavedFilter[];
}

const byOrder = (a: { sort_order: number; name: string }, b: { sort_order: number; name: string }) =>
  a.sort_order - b.sort_order || a.name.localeCompare(b.name);

/** 由扁平列表构建「已存筛选」树；指向不存在文件夹的条目放回根目录 */
export function buildFolderTree(folders: FilterFolder[], savedFilters: SavedFilter[]): FolderTree {
  const nodes = new Map<string, FolderNode>(
    folders.map((folder) => [folder.id, { folder, folders: [], filters: [] }])
  );
  const root: FolderTree = { folders: [], filters: [] };

  for (const folder of [...folders].sort(byOrder)) {
    const node = nodes.get(folder.id)!;
    const parent = folder.parent_id ? nodes.get(folder.parent_id) : undefined;
    (parent ? parent.folders : root.folders).push(node);
  }
  for (const filter of [...savedFilters].sort(byOrder)) {
    const parent = filter.folder_id ? nodes.get(filter.folder_id) : undefined;
    (parent ? parent.filters : root.filters).push(filter);
  }
  return root;
}

/** 深度优先展开为带层级的列表，用于文件夹下拉框 */
export function flattenFolders(tree: FolderTree): { folder: FilterFolder; depth: number }[] {
  const result: { folder: FilterFolder; depth: number }[] = [];
  const visit = (nodes: FolderNode[], depth: number) => {
    for (const node of nodes) {
      result.push({ folder: node.folder, depth });
      visit(node.folders, depth + 1);
    }
  };
  visit(tree.folders, 0);
  return result;
}

/** 文件夹直接包含的条目数（子文件夹 + 筛选） */
export function countChildren(node: FolderNode): number {
  return node.folders.length + node.filters.length;
}
