use crate::font::{FontInfo, FontScanner};

#[tauri::command]
pub async fn scan_fonts() -> Result<Vec<FontInfo>, String> {
    let scanner = FontScanner::new();
    scanner.scan_all_fonts()
}

#[tauri::command]
pub async fn refresh_fonts() -> Result<Vec<FontInfo>, String> {
    // Same as scan_fonts for now, can add caching later
    scan_fonts().await
}

#[tauri::command]
pub async fn toggle_font(font_id: String, enable: bool) -> Result<(), String> {
    // TODO: Implement font enable/disable functionality
    println!("Toggle font {} to {}", font_id, enable);
    Ok(())
}
