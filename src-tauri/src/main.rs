// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Use the library crate
use fontscape::app_state::AppServices;
use fontscape::commands::*;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let database_path = app.path().app_data_dir()?.join("fontscape.db");
            let services = AppServices::initialize(database_path)?;
            app.manage(services);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_fonts,
            refresh_fonts,
            toggle_font,
            check_glyphs_in_font,
            #[cfg(target_os = "windows")]
            open_in_explorer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
