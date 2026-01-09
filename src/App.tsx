import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { Outlet } from "react-router";
import { useFonts } from "./hooks/useFonts";

function App() {
  const appName = 'Fontscape';
  const { fontState, isLoading } = useFonts(); // 只在 App 挂载时扫描一次

  useEffect(() => {
    document.title = appName;
  }, [appName]);

  return (
    <AppLayout>
      <Outlet context={{ fontState, isLoading }} />
    </AppLayout>
  );
}

export default App;
