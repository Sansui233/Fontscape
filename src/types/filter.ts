export interface FilterCriteria {
  languages: string[];
  categories: string[];
  /** 名称（含本地化名）包含该文字；空字符串表示不限 */
  name_contains: string;
  /** 标签包含该文字；标签系统上线前不会匹配任何字体 */
  tag_contains: string;
}

/** 筛选面板的可选值，由后端 bootstrap 提供 */
export interface FilterOptions {
  languages: string[];
  categories: string[];
}

export type FilterGroup = "language" | "saved";

export interface SavedFilter {
  id: string;
  name: string;
  group_name: FilterGroup;
  criteria: FilterCriteria;
  /** 所在文件夹；null 表示位于「已存筛选」根目录 */
  folder_id: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

/** 「已存筛选」中的文件夹，可嵌套 */
export interface FilterFolder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface CreateFilterInput {
  name: string;
  criteria: FilterCriteria;
  folder_id: string | null;
}

export interface UpdateFilterInput {
  id: string;
  name: string;
  criteria: FilterCriteria;
  folder_id: string | null;
}

export interface CreateFolderInput {
  name: string;
  parent_id: string | null;
}

/** 删除文件夹时：连同内容删除，或把内容移到上一级 */
export type DeleteFolderMode = "delete_contents" | "move_contents_up";

export const EMPTY_FILTER_CRITERIA: FilterCriteria = {
  languages: [],
  categories: [],
  name_contains: "",
  tag_contains: "",
};

/** 兼容旧数据：补齐缺失的文本条件 */
export function withCriteriaDefaults(criteria: Partial<FilterCriteria>): FilterCriteria {
  return { ...EMPTY_FILTER_CRITERIA, ...criteria };
}
