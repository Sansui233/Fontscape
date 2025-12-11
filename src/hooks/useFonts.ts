import { useEffect } from 'react';
import { useFontStore } from '@/store/fontStore';
import { scanFonts } from '@/lib/tauri-api';

export function useFonts() {
  const fonts = useFontStore((state) => state.fonts);
  const isLoading = useFontStore((state) => state.isLoading);
  const setFonts = useFontStore((state) => state.setFonts);
  const setIsLoading = useFontStore((state) => state.setIsLoading);

  useEffect(() => {
    loadFonts();
  }, []);

  async function loadFonts() {
    setIsLoading(true);
    try {
      const fontList = await scanFonts();
      setFonts(fontList);
    } catch (error) {
      console.error('Failed to load fonts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    fonts,
    isLoading,
    refreshFonts: loadFonts,
  };
}
