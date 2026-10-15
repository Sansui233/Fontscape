import { FontGrid } from "@/components/font/FontGrid";
import { useFontStore } from "@/store/fontStore";

export function HomePage() {
  // App 在 bootstrap 完成后才渲染路由，此时 fontState 一定存在
  const fontState = useFontStore((state) => state.fontState);
  if (!fontState) return null;

  return <FontGrid fontState={fontState} />;
}
