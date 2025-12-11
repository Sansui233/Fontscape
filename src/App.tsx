import { AppLayout } from "./components/layout/AppLayout";
import { FontGrid } from "./components/font/FontGrid";
import { useFonts } from "./hooks/useFonts";

function App() {
  const { fonts, isLoading } = useFonts();

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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Font Manager</h1>
              <p className="text-muted-foreground mt-1">
                Found {fonts.length} fonts on your system
              </p>
            </div>
          </div>

          {/* Font Grid */}
          <FontGrid fonts={fonts} />
        </div>
      )}
    </AppLayout>
  );
}

export default App;
