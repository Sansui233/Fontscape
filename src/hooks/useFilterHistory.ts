import { sameCriteria } from "@/lib/font-filter";
import { useFilterStore } from "@/store/filterStore";
import type { FilterCriteria } from "@/types/filter";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

/** Grid / List 每条历史记录保存的筛选条件，后退 / 前进时恢复 */
export interface FilterHistoryState {
  criteria: FilterCriteria;
  activeFilterId: string | null;
}

export const isBrowsingPath = (pathname: string) => pathname === "/" || pathname === "/list";

const sameState = (a: FilterHistoryState, b: FilterHistoryState) =>
  a.activeFilterId === b.activeFilterId && sameCriteria(a.criteria, b.criteria);

export function useFilterHistory() {
  const criteria = useFilterStore((state) => state.criteria);
  const activeFilterId = useFilterStore((state) => state.activeFilterId);
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  locationRef.current = location;

  // 进入一条 Grid / List 记录：有保存的条件就恢复，没有就记下当前条件
  useEffect(() => {
    if (!isBrowsingPath(location.pathname)) return;
    const saved = location.state as FilterHistoryState | null;
    const { criteria, activeFilterId, setCriteria } = useFilterStore.getState();
    const current = { criteria, activeFilterId };
    if (!saved?.criteria) {
      navigate(location, { replace: true, state: current });
    } else if (!sameState(saved, current)) {
      setCriteria(saved.criteria, saved.activeFilterId);
    }
  }, [location, navigate]);

  // 在当前页改条件（Filter 面板、删除标签等）只更新当前记录，不新增历史
  useEffect(() => {
    const current = locationRef.current;
    if (!isBrowsingPath(current.pathname)) return;
    const next = { criteria, activeFilterId };
    const saved = current.state as FilterHistoryState | null;
    if (saved?.criteria && sameState(saved, next)) return;
    navigate(current, { replace: true, state: next });
  }, [criteria, activeFilterId, navigate]);
}
