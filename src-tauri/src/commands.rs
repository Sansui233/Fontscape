use crate::font::{FontScanner, FontState, GlyphCheckResult, check_glyphs};

#[tauri::command]
pub async fn scan_fonts() -> Result<FontState, String> {
    let scanner = FontScanner::new();
    scanner.scan_all_fonts()
}

#[tauri::command]
pub async fn refresh_fonts() -> Result<FontState, String> {
    // Same as scan_fonts for now, can add caching later
    scan_fonts().await
}

#[tauri::command]
pub async fn toggle_font(font_id: String, enable: bool) -> Result<(), String> {
    // TODO: Implement font enable/disable functionality
    println!("Toggle font {} to {}", font_id, enable);
    Ok(())
}

#[tauri::command]
pub async fn check_glyphs_in_font(font_path: String, text: String) -> Result<Vec<GlyphCheckResult>, String> {
    check_glyphs(font_path, text)
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn open_in_explorer(path: String) -> Result<(), String> {
    use std::process::Command;

    // Use explorer.exe with /select flag to open and select the file
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .map_err(|e| format!("Failed to open explorer: {}", e))?;

    Ok(())
}