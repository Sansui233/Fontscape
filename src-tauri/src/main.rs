// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod font;

use commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            scan_fonts,
            refresh_fonts,
            toggle_font,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
