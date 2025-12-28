import { useEffect } from "react";
import { FontGrid } from "./components/font/FontGrid";
import { AppLayout } from "./components/layout/AppLayout";
import { useFonts } from "./hooks/useFonts";

function App() {
  const { fonts, isLoading } = useFonts();
  const appName = 'Fontscape';

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
        <div className="h-full flex flex-col p-6">
          {/* Font Grid with full height for virtual scrolling */}
          <div className="flex-1 min-h-0">
            <FontGrid fonts={fonts} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default App;
