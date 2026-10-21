use crate::app_state::{AppServices, AppState};
use crate::bootstrap::{reconcile_ui_state, BootstrapPayload, FilterOptions};
use crate::filters::{
    CreateFilterInput, CreateFolderInput, DeleteFolderMode, FilterError, FilterFolder, SavedFilter,
    UpdateFilterInput,
};
use crate::font::{check_glyphs, FontCache, FontScanner, FontState, GlyphCheckResult};
use crate::persistence::{migrations::LATEST_SCHEMA_VERSION, PersistenceError};
use crate::settings::{PersistedUiState, UserPreferences};
use crate::tags::{Tag, TagError};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

/// 返回给前端的统一错误：code 稳定、可判断；message 可直接展示
#[derive(Debug, Serialize)]
pub struct CommandError {
    pub code: &'static str,
    pub message: String,
}

impl CommandError {
    fn new(code: &'static str, message: impl ToString) -> Self {
        Self {
            code,
            message: message.to_string(),
        }
    }
}

impl From<FilterError> for CommandError {
    fn from(error: FilterError) -> Self {
        Self::new(error.code(), error)
    }
}

impl From<TagError> for CommandError {
    fn from(error: TagError) -> Self {
        Self::new(error.code(), error)
    }
}

impl From<PersistenceError> for CommandError {
    fn from(error: PersistenceError) -> Self {
        Self::new("storage", error)
    }
}

type CommandResult<T> = Result<T, CommandError>;

fn with_services<T>(
    state: &State<'_, AppState>,
    action: impl FnOnce(&AppServices) -> CommandResult<T>,
) -> CommandResult<T> {
    let guard = state
        .services
        .read()
        .map_err(|_| CommandError::new("database_unavailable", "database lock poisoned"))?;
    let services = guard
        .as_ref()
        .map_err(|message| CommandError::new("database_unavailable", message))?;
    action(services)
}

/// 字体目录有变化时推给前端的事件，载荷为 FontChanges
pub const FONTS_CHANGED_EVENT: &str = "fonts_changed";

async fn run_blocking<T: Send + 'static>(
    task: impl FnOnce() -> Result<T, PersistenceError> + Send + 'static,
) -> CommandResult<T> {
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|error| CommandError::new("scan_failed", error))?
        .map_err(|error| CommandError::new("scan_failed", error))
}

fn font_cache(state: &State<'_, AppState>) -> CommandResult<FontCache> {
    with_services(state, |services| Ok(services.fonts.clone()))
}

/// 启动时唯一的数据入口：字体、Filter、设置一次返回。
/// 有缓存时直接返回缓存，再在后台对比字体目录，有变化时发送 fonts_changed；
/// 第一次启动（或解析版本变化）没有可用缓存，同步完成解析后再返回。
#[tauri::command]
pub async fn bootstrap_app(
    app: AppHandle,
    state: State<'_, AppState>,
) -> CommandResult<BootstrapPayload> {
    let (filters, folders, tags, family_tags, ui_state, preferences, cache) = with_services(&state, |services| {
        let filters = services.filters.list()?;
        let folders = services.filters.list_folders()?;
        let tags = services.tags.list()?;
        let family_tags = services.tags.list_assignments()?;
        let ui_state = reconcile_ui_state(services.settings.load_ui_state()?, &filters);
        let preferences = services.settings.load_preferences()?;
        Ok((filters, folders, tags, family_tags, ui_state, preferences, services.fonts.clone()))
    })?;

    let cached = run_blocking({
        let cache = cache.clone();
        move || cache.load()
    })
    .await?;
    let font_state = match cached {
        Some(font_state) => {
            tauri::async_runtime::spawn_blocking(move || match cache.reconcile(false) {
                Ok((_, changes)) if !changes.is_empty() => {
                    let _ = app.emit(FONTS_CHANGED_EVENT, changes);
                }
                Ok(_) => {}
                Err(error) => println!("Background font reconcile failed: {error}"),
            });
            font_state
        }
        None => run_blocking(move || cache.reconcile(false)).await?.0,
    };

    Ok(BootstrapPayload {
        font_state,
        filters,
        folders,
        tags,
        family_tags,
        filter_options: FilterOptions::default(),
        ui_state,
        preferences,
    })
}

/// 忽略缓存，重新解析全部字体文件
#[tauri::command]
pub async fn scan_fonts(state: State<'_, AppState>) -> CommandResult<FontState> {
    let cache = font_cache(&state)?;
    Ok(run_blocking(move || cache.reconcile(true)).await?.0)
}

/// 增量刷新：只解析新增和变化的文件
#[tauri::command]
pub async fn refresh_fonts(state: State<'_, AppState>) -> CommandResult<FontState> {
    let cache = font_cache(&state)?;
    Ok(run_blocking(move || cache.reconcile(false)).await?.0)
}

#[tauri::command]
pub fn create_filter(
    state: State<'_, AppState>,
    input: CreateFilterInput,
) -> CommandResult<SavedFilter> {
    with_services(&state, |services| Ok(services.filters.create(input)?))
}

#[tauri::command]
pub fn update_filter(
    state: State<'_, AppState>,
    input: UpdateFilterInput,
) -> CommandResult<SavedFilter> {
    with_services(&state, |services| Ok(services.filters.update(input)?))
}

#[tauri::command]
pub fn delete_filter(state: State<'_, AppState>, id: String) -> CommandResult<()> {
    with_services(&state, |services| Ok(services.filters.delete(&id)?))
}

#[tauri::command]
pub fn move_filter(
    state: State<'_, AppState>,
    id: String,
    folder_id: Option<String>,
) -> CommandResult<()> {
    with_services(&state, |services| Ok(services.filters.move_filter(&id, folder_id.as_deref())?))
}

#[tauri::command]
pub fn create_folder(
    state: State<'_, AppState>,
    input: CreateFolderInput,
) -> CommandResult<FilterFolder> {
    with_services(&state, |services| Ok(services.filters.create_folder(input)?))
}

#[tauri::command]
pub fn rename_folder(state: State<'_, AppState>, id: String, name: String) -> CommandResult<FilterFolder> {
    with_services(&state, |services| Ok(services.filters.rename_folder(&id, &name)?))
}

#[tauri::command]
pub fn move_folder(
    state: State<'_, AppState>,
    id: String,
    parent_id: Option<String>,
) -> CommandResult<()> {
    with_services(&state, |services| Ok(services.filters.move_folder(&id, parent_id.as_deref())?))
}

/// 返回随文件夹一起删除的筛选 ID
#[tauri::command]
pub fn delete_folder(
    state: State<'_, AppState>,
    id: String,
    mode: DeleteFolderMode,
) -> CommandResult<Vec<String>> {
    with_services(&state, |services| Ok(services.filters.delete_folder(&id, mode)?))
}

#[tauri::command]
pub fn create_tag(state: State<'_, AppState>, name: String) -> CommandResult<Tag> {
    with_services(&state, |services| Ok(services.tags.create(&name)?))
}

#[tauri::command]
pub fn rename_tag(state: State<'_, AppState>, id: String, name: String) -> CommandResult<Tag> {
    with_services(&state, |services| Ok(services.tags.rename(&id, &name)?))
}

#[tauri::command]
pub fn delete_tag(state: State<'_, AppState>, id: String) -> CommandResult<()> {
    with_services(&state, |services| Ok(services.tags.delete(&id)?))
}

/// tagged 为 true 时给这些家族加上标签，否则去掉
#[tauri::command]
pub fn set_family_tag(
    state: State<'_, AppState>,
    tag_id: String,
    families: Vec<String>,
    tagged: bool,
) -> CommandResult<()> {
    with_services(&state, |services| Ok(services.tags.set_families(&tag_id, &families, tagged)?))
}

#[tauri::command]
pub fn save_ui_state(state: State<'_, AppState>, ui_state: PersistedUiState) -> CommandResult<()> {
    with_services(&state, |services| Ok(services.settings.save_ui_state(&ui_state)?))
}

#[tauri::command]
pub fn save_preferences(
    state: State<'_, AppState>,
    preferences: UserPreferences,
) -> CommandResult<()> {
    with_services(&state, |services| Ok(services.settings.save_preferences(&preferences)?))
}

/// 设置页「关于 / 数据」所需的信息
#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub version: String,
    pub database_path: String,
    pub schema_version: i64,
    pub font_directories: Vec<String>,
}

#[tauri::command]
pub fn get_app_info(app: tauri::AppHandle, state: State<'_, AppState>) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        database_path: state.database_path.display().to_string(),
        schema_version: LATEST_SCHEMA_VERSION,
        font_directories: FontScanner::new()
            .font_dirs()
            .iter()
            .map(|dir| dir.display().to_string())
            .collect(),
    }
}

/// 备份并重建数据库：命名 Filter 与设置恢复默认。返回备份文件路径。
#[tauri::command]
pub fn reset_database(state: State<'_, AppState>) -> CommandResult<Option<String>> {
    state
        .reset_database()
        .map(|backup| backup.map(|path| path.display().to_string()))
        .map_err(|message| CommandError::new("reset_failed", message))
}

#[tauri::command]
pub async fn toggle_font(font_id: String, enable: bool) -> CommandResult<()> {
    // 尚未实现：返回错误，避免前端误以为状态已改变
    let _ = (font_id, enable);
    Err(CommandError::new(
        "not_implemented",
        "Font enable/disable is not implemented yet",
    ))
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

/// 自绘标题栏的按钮拿不到 Windows 11 的分屏布局浮层（Snap Layouts），
/// 悬停最大化按钮时模拟 Win+Z 唤出同一个浮层。仅在本窗口处于前台时发送，避免作用到其他窗口。
#[cfg(target_os = "windows")]
#[tauri::command]
pub fn show_snap_layouts(window: tauri::WebviewWindow) -> Result<(), String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VIRTUAL_KEY, VK_LWIN, VK_Z,
    };

    if !window.is_focused().unwrap_or(false) {
        return Ok(());
    }

    let key = |vk: VIRTUAL_KEY, up: bool| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: if up { KEYEVENTF_KEYUP } else { KEYBD_EVENT_FLAGS(0) },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let inputs = [key(VK_LWIN, false), key(VK_Z, false), key(VK_Z, true), key(VK_LWIN, true)];
    let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };

    if sent as usize == inputs.len() {
        Ok(())
    } else {
        Err("Failed to send snap layout shortcut".to_string())
    }
}
