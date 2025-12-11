import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
/**
 * Format date to locale string
 */

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
} export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const debounce = <T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number,
) => {
  let timeoutTimer: ReturnType<typeof setTimeout>;

  return (...args: T) => {
    clearTimeout(timeoutTimer);

    timeoutTimer = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};

export const debounceWithCallbackRef = <T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number,
) => {
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  // 新增：callbackRef 指向“最新的 callback
  // 否则 debounced 内部闭包会捕获初始的 callback
  const callbackRef = { current: callback };

  const debounced = (...args: T) => {
    if (timeoutTimer) clearTimeout(timeoutTimer);

    timeoutTimer = setTimeout(() => {
      callbackRef.current(...args); // 调用最新 callback
    }, delay);
  };

  // 让外部可以更新最新 callback
  (debounced as any).callbackRef = callbackRef;
  return debounced as typeof debounced & { callbackRef: typeof callbackRef };
};