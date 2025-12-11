import { useEffect } from "react";
import { FontGrid } from "./components/font/FontGrid";
import { AppLayout } from "./components/layout/AppLayout";
import { useFonts } from "./hooks/useFonts";
import { useUIStore } from "./store/uiStore";

function App() {
  const { fonts, isLoading } = useFonts();
  const store = useUIStore();
  const appName = store.language === 'zh-CN' ? '字体管理器' : 'Font Manager';

  // Update document title based on locale
  useEffect(() => {
    document.title = appName;
  }, [appName]);

  return (
    <AppLayout>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-muted-foreground">Loading fonts...</p>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Font Grid */}
          <FontGrid fonts={fonts} />
        </div>
      )}
    </AppLayout>
  );
}

export default App;
