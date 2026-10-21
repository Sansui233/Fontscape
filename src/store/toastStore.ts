import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "error";
  /** 正在播放离开动画，结束后由 remove 移除 */
  leaving: boolean;
}

interface ToastStore {
  toasts: Toast[];
  show: (message: string, tone?: Toast["tone"], durationMs?: number) => void;
  dismiss: (id: number) => void;
  remove: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  show: (message, tone = "info", durationMs = 4000) => {
    const id = ++nextId;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone, leaving: false }] }));
    setTimeout(() => get().dismiss(id), durationMs);
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
    })),
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export const showToast = (message: string, tone?: Toast["tone"], durationMs?: number) =>
  useToastStore.getState().show(message, tone, durationMs);
