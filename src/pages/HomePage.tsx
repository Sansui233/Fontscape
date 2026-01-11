import { FontGrid } from "@/components/font/FontGrid";
import { useOutletContext } from "react-router";
import { FontState } from "@/types/font";

interface OutletContext {
  fontState: FontState | undefined;
  isLoading: boolean;
}

export function HomePage() {
  const { fontState, isLoading } = useOutletContext<OutletContext>();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading fonts...</p>
        </div>
      </div>
    );
  }

  if (!fontState) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <FontGrid fontState={fontState} />
      </div>
    </div>
  );
}
