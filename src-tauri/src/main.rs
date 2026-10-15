// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Use the library crate
use fontscape::app_state::AppState;
use fontscape::commands::*;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let database_path = app.path().app_data_dir()?.join("fontscape.db");
            app.manage(AppState::initialize(database_path));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            bootstrap_app,
            scan_fonts,
            refresh_fonts,
            create_filter,
            update_filter,
            delete_filter,
            move_filter,
            create_folder,
            rename_folder,
            move_folder,
            delete_folder,
            create_tag,
            rename_tag,
            delete_tag,
            set_family_tag,
            save_ui_state,
            save_preferences,
            get_app_info,
            reset_database,
            toggle_font,
            check_glyphs_in_font,
            #[cfg(target_os = "windows")]
            open_in_explorer,
            #[cfg(target_os = "windows")]
            show_snap_layouts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
