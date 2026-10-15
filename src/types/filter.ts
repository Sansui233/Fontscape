export const LANGUAGE_FILTER_OPTIONS = [
  "English",
  "Chinese",
  "Japanese",
  "Korean",
  "Russian",
  "Arabic",
  "Unknown",
] as const;

export interface FilterCriteria {
  languages: string[];
  categories: string[];
}

export type FilterGroup = "language" | "saved";

export interface SavedFilter {
  id: string;
  name: string;
  group_name: FilterGroup;
  criteria: FilterCriteria;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface CreateFilterInput {
  name: string;
  criteria: FilterCriteria;
}

export interface UpdateFilterInput {
  id: string;
  name: string;
  criteria: FilterCriteria;
}

export const EMPTY_FILTER_CRITERIA: FilterCriteria = {
  languages: [],
  categories: [],
};
