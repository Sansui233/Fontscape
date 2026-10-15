import { useUIStore } from "@/store/uiStore";
import { useEffect } from "react";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

/** 把外观设置应用到 <html class="dark">；跟随系统时监听系统切换 */
export function useTheme() {
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && darkQuery.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };

    apply();
    if (theme !== "system") return;
    darkQuery.addEventListener("change", apply);
    return () => darkQuery.removeEventListener("change", apply);
  }, [theme]);
}
