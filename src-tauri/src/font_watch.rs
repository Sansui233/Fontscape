//! 监听字体目录。目录静默（用户设置的秒数内没有新事件）后做一次 reconcile，
//! 有变化时把完整 FontState 通过 fonts_changed 推给前端，由前端与界面当前数据对比。

use crate::app_state::AppState;
use notify::{RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

/// 载荷为完整 FontState
pub const FONTS_CHANGED_EVENT: &str = "fonts_changed";

/// 每次从 AppState 取当前服务，重建数据库后也不会写到旧库
fn current<T>(app: &AppHandle, pick: impl FnOnce(&crate::app_state::AppServices) -> T) -> Option<T> {
    let state = app.state::<AppState>();
    let guard = state.services.read().ok()?;
    guard.as_ref().ok().map(pick)
}

/// 在当前线程做一次增量对比，有变化时发送 fonts_changed
pub fn reconcile_and_notify(app: &AppHandle) {
    let Some(cache) = current(app, |services| services.fonts.clone()) else {
        return;
    };
    match cache.reconcile(false) {
        Ok((font_state, changes)) if !changes.is_empty() => {
            let _ = app.emit(FONTS_CHANGED_EVENT, font_state);
        }
        Ok(_) => {}
        Err(error) => println!("Background font reconcile failed: {error}"),
    }
}

/// 启动监听线程。启动时不存在的目录不监听。
pub fn start(app: AppHandle, dirs: Vec<PathBuf>) {
    std::thread::spawn(move || {
        let (sender, receiver) = mpsc::channel();
        let mut watcher = match notify::recommended_watcher(sender) {
            Ok(watcher) => watcher,
            Err(error) => return println!("Font folder watcher unavailable: {error}"),
        };
        for dir in dirs.iter().filter(|dir| dir.exists()) {
            if let Err(error) = watcher.watch(dir, RecursiveMode::NonRecursive) {
                println!("Failed to watch {:?}: {}", dir, error);
            }
        }

        // 一批事件的第一个到达后，等到静默再处理；延迟每批读取一次，设置修改后下一批生效
        while receiver.recv().is_ok() {
            let delay = current(&app, |services| services.settings.load_preferences().ok())
                .flatten()
                .map_or(5, |preferences| preferences.font_watch_delay_secs);
            while receiver.recv_timeout(Duration::from_secs(delay.into())).is_ok() {}
            reconcile_and_notify(&app);
        }
    });
}
