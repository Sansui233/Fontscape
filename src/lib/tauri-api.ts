import { FontState } from "@/types/font";
import { invoke } from "@tauri-apps/api/core";

export async function scanFonts(): Promise<FontState> {
  try {
    return await invoke<FontState>("scan_fonts");
  } catch (error) {
    console.error("Failed to scan fonts:", error);
    throw error;
  }
}

export async function refreshFonts(): Promise<FontState> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    return await invoke<FontState>("refresh_fonts");
  } catch (error) {
    console.error("Failed to refresh fonts:", error);
    throw error;
  }
}

export async function toggleFont(
  fontId: string,
  enable: boolean
): Promise<void> {
  try {
    await invoke("toggle_font", { fontId, enable });
  } catch (error) {
    console.error("Failed to toggle font:", error);
    throw error;
  }
}

export async function checkGlyphsInFont(
  fontPath: string,
  text: string
): Promise<{ glyph: string; exists: boolean }[]> {
  try {
    return await invoke<{ glyph: string; exists: boolean }[]>(
      "check_glyphs_in_font",
      { fontPath, text }
    );
  } catch (error) {
    console.error("Failed to check glyphs in font:", error);
    throw error;
  }
}
