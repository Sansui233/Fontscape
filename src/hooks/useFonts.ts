import { scanFonts } from '@/lib/tauri-api';
import { useFontStore } from '@/store/fontStore';
import { useEffect } from 'react';

export function useFonts() {
  const fontState = useFontStore((state) => state.fontState);
  const isLoading = useFontStore((state) => state.isLoading);
  const setFontState = useFontStore((state) => state.setFontState);
  const setIsLoading = useFontStore((state) => state.setIsLoading);

  useEffect(() => {
    loadFonts();
  }, []);

  async function loadFonts() {
    setIsLoading(true);
    try {
      const fontState = await scanFonts();
      setFontState(fontState);
    } catch (error) {
      console.error('Failed to load fonts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    fontState,
    isLoading,
    refreshFonts: loadFonts,
  };
}
