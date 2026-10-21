import { startSettingsSync } from "@/lib/settings-sync";
import { bootstrapApp, onFontsChanged } from "@/lib/tauri-api";
import { useFilterStore } from "@/store/filterStore";
import { useFontStore } from "@/store/fontStore";
import { useTagStore } from "@/store/tagStore";
import { useUIStore } from "@/store/uiStore";
import type { BootstrapPayload, CommandError } from "@/types/application";
import { useCallback, useEffect, useState } from "react";

type BootstrapStatus =
  | { state: "loading" }
  | { state: "ready" }
  | { state: "error"; error: CommandError };

// StrictMode 下 effect 会执行两次，共享同一个请求，保证只扫描一次
let pending: Promise<BootstrapPayload> | null = null;
let stopSync: (() => void) | null = null;

function applyPayload(payload: BootstrapPayload) {
  useFontStore.getState().setFontState(payload.font_state);
  useFilterStore
    .getState()
    .hydrate(payload.filters, payload.folders, payload.filter_options, payload.ui_state);
  useTagStore.getState().hydrate(payload.tags, payload.family_tags);
  useUIStore.getState().hydrate(payload.ui_state, payload.preferences);
  stopSync?.();
  stopSync = startSettingsSync();
}

export function useBootstrap() {
  const [status, setStatus] = useState<BootstrapStatus>({ state: "loading" });

  const run = useCallback(() => {
    setStatus({ state: "loading" });
    // 先注册监听：bootstrap 返回缓存后，后台对比可能很快就发出变化
    pending ??= onFontsChanged((state) => useFontStore.getState().setPendingState(state)).then(
      () => bootstrapApp()
    );
    pending
      .then((payload) => {
        applyPayload(payload);
        setStatus({ state: "ready" });
      })
      .catch((error: CommandError) => {
        pending = null; // 允许重试
        setStatus({ state: "error", error });
      });
  }, []);

  useEffect(run, [run]);

  return { status, retry: run };
}
