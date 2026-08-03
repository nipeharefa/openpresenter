use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_dialog::DialogExt;

use crate::db;
use crate::monitor::{self, MonitorInfo};
use crate::state::{LiveItem, LiveState, LiveView};

fn emit_view(app: &AppHandle, state: &LiveState) -> Result<(), String> {
    app.emit("live:changed", state.view()).map_err(|e| e.to_string())
}

fn db_error(e: rusqlite::Error) -> String {
    format!("db: {e}")
}

fn to_live_item(item: db::Item) -> LiveItem {
    LiveItem {
        id: item.id,
        title: item.title,
        text: item.text,
        library_item_id: item.library_item_id,
        kind: item.kind,
        slides: item.slides,
    }
}

fn media_abs_path(app: &AppHandle, stored_name: &str) -> String {
    app.path()
        .app_data_dir()
        .unwrap()
        .join("media")
        .join(stored_name)
        .to_string_lossy()
        .into_owned()
}

fn resolve_item_paths(app: &AppHandle, items: &mut [db::Item]) {
    for item in items.iter_mut() {
        for slide in item.slides.iter_mut() {
            if let Some(bg) = &mut slide.background {
                if !bg.stored_name.is_empty() {
                    bg.path = media_abs_path(app, &bg.stored_name);
                }
            }
        }
    }
}

fn unique_name(ext: &str) -> String {
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{}_{}.{}", std::process::id(), ms, ext)
}

#[tauri::command]
pub fn list_urutan(app: AppHandle) -> Result<Vec<db::Urutan>, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::list_urutan(&conn).map_err(db_error)
}

#[tauri::command]
pub fn create_urutan(app: AppHandle, name: String) -> Result<db::Urutan, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::create_urutan(&conn, &name).map_err(db_error)
}

#[tauri::command]
pub fn delete_urutan(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    id: i64,
) -> Result<(), String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::delete_urutan(&conn, id).map_err(db_error)?;
    let mut live = state.lock().unwrap();
    if live.urutan_id == Some(id) {
        live.urutan_id = None;
        live.urutan_name = None;
        live.items.clear();
        live.item_index = 0;
        live.slide_index = 0;
        live.black = false;
        emit_view(&app, &live)?;
    }
    Ok(())
}

#[tauri::command]
pub fn load_urutan(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    id: i64,
) -> Result<db::Urutan, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let urutan = db::get_urutan(&conn, id)
        .map_err(db_error)?
        .ok_or_else(|| "urutan tidak ditemukan".to_string())?;
    let mut items = db::list_items(&conn, id).map_err(db_error)?;
    resolve_item_paths(&app, &mut items);
    db::set_meta(&conn, "last_urutan", &id.to_string()).map_err(db_error)?;

    let mut live = state.lock().unwrap();
    live.urutan_id = Some(id);
    live.urutan_name = Some(urutan.name.clone());
    live.items = items.into_iter().map(to_live_item).collect();
    live.item_index = 0;
    live.slide_index = 0;
    live.black = false;
    emit_view(&app, &live)?;
    Ok(urutan)
}

#[tauri::command]
pub fn add_item(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    urutan_id: i64,
    title: String,
    text: String,
) -> Result<db::Item, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let item = db::add_item(&conn, urutan_id, &title, &text).map_err(db_error)?;
    reload_if_current(&app, &state, urutan_id)?;
    Ok(item)
}

#[tauri::command]
pub fn save_item(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    id: i64,
    title: String,
    text: String,
) -> Result<db::Item, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let existing = db::get_item(&conn, id).map_err(db_error)?;
    let mut item = match existing {
        Some(item) if item.library_item_id.is_some() => item,
        _ => db::save_item(&conn, id, &title, &text).map_err(db_error)?,
    };
    resolve_item_paths(&app, std::slice::from_mut(&mut item));
    let mut live = state.lock().unwrap();
    if live.urutan_id == Some(item.urutan_id) {
        if let Some(current) = live.items.iter_mut().find(|i| i.id == id) {
            current.title = item.title.clone();
            current.text = item.text.clone();
            current.library_item_id = item.library_item_id;
            current.kind = item.kind.clone();
            current.slides = item.slides.clone();
        }
        if live.item_index >= live.items.len() {
            live.item_index = live.items.len().saturating_sub(1);
        }
        if live.slide_index >= live.slide_count() {
            live.slide_index = live.slide_count().saturating_sub(1);
        }
        emit_view(&app, &live)?;
    }
    Ok(item)
}

#[tauri::command]
pub fn delete_item(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    id: i64,
) -> Result<(), String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let item = db::get_item(&conn, id).map_err(db_error)?;
    db::delete_item(&conn, id).map_err(db_error)?;
    if let Some(item) = item {
        reload_if_current(&app, &state, item.urutan_id)?;
    }
    Ok(())
}

#[tauri::command]
pub fn move_item(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    urutan_id: i64,
    item_id: i64,
    new_position: i64,
) -> Result<(), String> {
    let mut conn = db::connect(&app).map_err(db_error)?;
    db::reorder_item(&mut conn, urutan_id, item_id, new_position).map_err(db_error)?;
    reload_if_current(&app, &state, urutan_id)?;
    Ok(())
}

#[tauri::command]
pub fn next_slide(app: AppHandle, state: State<'_, Mutex<LiveState>>) -> Result<(), String> {
    let mut live = state.lock().unwrap();
    if live.at_end() {
        return Ok(());
    }
    if live.slide_index + 1 < live.slide_count() {
        live.slide_index += 1;
    } else {
        live.item_index += 1;
        live.slide_index = 0;
    }
    emit_view(&app, &live)
}

#[tauri::command]
pub fn prev_slide(app: AppHandle, state: State<'_, Mutex<LiveState>>) -> Result<(), String> {
    let mut live = state.lock().unwrap();
    if live.item_index == 0 && live.slide_index == 0 {
        return Ok(());
    }
    if live.slide_index > 0 {
        live.slide_index -= 1;
    } else {
        live.item_index -= 1;
        live.slide_index = live.slide_count().saturating_sub(1);
    }
    emit_view(&app, &live)
}

#[tauri::command]
pub fn jump_item(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    index: usize,
) -> Result<(), String> {
    let mut live = state.lock().unwrap();
    if index >= live.items.len() {
        return Ok(());
    }
    live.item_index = index;
    live.slide_index = 0;
    emit_view(&app, &live)
}

#[tauri::command]
pub fn toggle_black(app: AppHandle, state: State<'_, Mutex<LiveState>>) -> Result<(), String> {
    let mut live = state.lock().unwrap();
    live.black = !live.black;
    emit_view(&app, &live)
}

#[tauri::command]
pub fn get_live(state: State<'_, Mutex<LiveState>>) -> LiveView {
    state.lock().unwrap().view()
}

#[tauri::command]
pub fn list_monitors(app: AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let primary = app.primary_monitor().map_err(|e| e.to_string())?;
    Ok(monitors
        .iter()
        .map(|m| MonitorInfo::from_monitor(m, primary.as_ref()))
        .collect())
}

#[tauri::command]
pub fn open_projection(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    monitor: Option<String>,
) -> Result<(), String> {
    let target = resolve_monitor_target(&app, monitor.as_deref())?;
    if let Some(window) = app.get_webview_window("projection") {
        place_projection(&window, target.as_ref())?;
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        set_projection_open(&app, &state, true)?;
        return Ok(());
    }
    let (x, y, width, height) = match &target {
        Some(m) => (
            m.x as f64 / m.scale_factor,
            m.y as f64 / m.scale_factor,
            m.width as f64 / m.scale_factor,
            m.height as f64 / m.scale_factor,
        ),
        None => (0.0, 0.0, 1280.0, 720.0),
    };
    let window = WebviewWindowBuilder::new(&app, "projection", WebviewUrl::App("index.html".into()))
        .title("OpenPresenter - Proyeksi")
        .inner_size(width, height)
        .position(x, y)
        .background_color(tauri::window::Color(0, 0, 0, 255))
        .additional_browser_args(
            "--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows",
        )
        .build()
        .map_err(|e| e.to_string())?;
    window.set_fullscreen(true).map_err(|e| e.to_string())?;
    set_projection_open(&app, &state, true)
}

#[tauri::command]
pub fn close_projection(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("projection") {
        window.close().map_err(|e| e.to_string())?;
    }
    set_projection_open(&app, &state, false)
}

#[tauri::command]
pub fn get_projection_open(state: State<'_, Mutex<LiveState>>) -> bool {
    state.lock().unwrap().projection_open
}

pub fn set_projection_open(
    app: &AppHandle,
    state: &State<'_, Mutex<LiveState>>,
    open: bool,
) -> Result<(), String> {
    let mut live = state.lock().unwrap();
    if live.projection_open != open {
        live.projection_open = open;
        app.emit("projection:changed", open).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn on_projection_close(window: &tauri::Window) {
    let handle = window.app_handle().clone();
    let state = handle.state::<Mutex<LiveState>>();
    let mut live = state.lock().unwrap();
    if live.projection_open {
        live.projection_open = false;
        let _ = handle.emit("projection:changed", false);
    }
}

#[tauri::command]
pub fn set_projection_monitor(app: AppHandle, name: Option<String>) -> Result<(), String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::set_meta(&conn, "projection_monitor", name.as_deref().unwrap_or(""))
        .map_err(db_error)?;
    let target = resolve_monitor_target(&app, name.as_deref())?;
    if let Some(window) = app.get_webview_window("projection") {
        place_projection(&window, target.as_ref())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_projection_monitor(app: AppHandle) -> Result<Option<String>, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let value = db::get_meta(&conn, "projection_monitor").map_err(db_error)?;
    Ok(value.filter(|s| !s.is_empty()))
}

fn resolve_monitor_target(
    app: &AppHandle,
    preferred: Option<&str>,
) -> Result<Option<MonitorInfo>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let primary = app.primary_monitor().map_err(|e| e.to_string())?;
    let infos: Vec<MonitorInfo> = monitors
        .iter()
        .map(|m| MonitorInfo::from_monitor(m, primary.as_ref()))
        .collect();
    Ok(monitor::pick_target_monitor(preferred, &infos).map(|i| infos[i].clone()))
}

fn place_projection(window: &WebviewWindow, target: Option<&MonitorInfo>) -> Result<(), String> {
    if window.is_fullscreen().unwrap_or(false) {
        window.set_fullscreen(false).map_err(|e| e.to_string())?;
    }
    if let Some(m) = target {
        window
            .set_position(PhysicalPosition::new(m.x, m.y))
            .map_err(|e| e.to_string())?;
        window
            .set_size(PhysicalSize::new(m.width, m.height))
            .map_err(|e| e.to_string())?;
    }
    window.set_fullscreen(true).map_err(|e| e.to_string())?;
    Ok(())
}

fn reload_if_current(
    app: &AppHandle,
    state: &State<'_, Mutex<LiveState>>,
    urutan_id: i64,
) -> Result<(), String> {
    let mut live = state.lock().unwrap();
    if live.urutan_id != Some(urutan_id) {
        return Ok(());
    }
    let conn = db::connect(app).map_err(db_error)?;
    let mut items = db::list_items(&conn, urutan_id).map_err(db_error)?;
    resolve_item_paths(app, &mut items);
    live.items = items.into_iter().map(to_live_item).collect();
    if live.item_index >= live.items.len() {
        live.item_index = live.items.len().saturating_sub(1);
    }
    if live.slide_index >= live.slide_count() {
        live.slide_index = live.slide_count().saturating_sub(1);
    }
    emit_view(app, &live)
}

fn current_urutan_if_refs_item(app: &AppHandle, library_item_id: i64) -> Option<i64> {
    let state = app.state::<Mutex<LiveState>>();
    let live = state.lock().unwrap();
    if live
        .items
        .iter()
        .any(|i| i.library_item_id == Some(library_item_id))
    {
        live.urutan_id
    } else {
        None
    }
}

/* ---------- Unified library commands ---------- */

#[tauri::command]
pub fn list_library(
    app: AppHandle,
    kind: Option<String>,
    title: Option<String>,
    tags: Vec<String>,
) -> Result<Vec<db::LibraryItem>, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::list_library(&conn, kind.as_deref(), title.as_deref(), &tags).map_err(db_error)
}

#[tauri::command]
pub fn get_library_item(app: AppHandle, id: i64) -> Result<Option<db::LibraryItemDetail>, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let mut detail = db::get_library_item_detail(&conn, id).map_err(db_error)?;
    if let Some(d) = &mut detail {
        if let Some(m) = &mut d.media {
            m.path = media_abs_path(&app, &m.stored_name);
        }
    }
    Ok(detail)
}

#[tauri::command]
pub fn create_library_item(
    app: AppHandle,
    kind: String,
    title: String,
) -> Result<db::LibraryItem, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::create_library_item(&conn, &kind, &title).map_err(db_error)
}

#[tauri::command]
pub fn rename_library_item(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    id: i64,
    title: String,
) -> Result<(), String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::rename_library_item(&conn, id, &title).map_err(db_error)?;
    if let Some(urutan_id) = current_urutan_if_refs_item(&app, id) {
        reload_if_current(&app, &state, urutan_id)?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_library_item(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    id: i64,
) -> Result<(), String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let stored = db::delete_library_item(&conn, id).map_err(db_error)?;
    if let Some(stored_name) = stored {
        let _ = std::fs::remove_file(
            app.path().app_data_dir().unwrap().join("media").join(stored_name),
        );
    }
    if let Some(urutan_id) = current_urutan_if_refs_item(&app, id) {
        reload_if_current(&app, &state, urutan_id)?;
    }
    Ok(())
}

#[tauri::command]
pub fn save_song_text(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    item_id: i64,
    text: String,
) -> Result<(), String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::save_song_text(&conn, item_id, &text).map_err(db_error)?;
    if let Some(urutan_id) = current_urutan_if_refs_item(&app, item_id) {
        reload_if_current(&app, &state, urutan_id)?;
    }
    Ok(())
}

#[tauri::command]
pub fn add_slide(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    item_id: i64,
    title: String,
    body: String,
) -> Result<db::PresentationSlide, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let slide = db::add_presentation_slide(&conn, item_id, &title, &body).map_err(db_error)?;
    if let Some(urutan_id) = current_urutan_if_refs_item(&app, item_id) {
        reload_if_current(&app, &state, urutan_id)?;
    }
    Ok(slide)
}

#[tauri::command]
pub fn save_slide(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    id: i64,
    title: String,
    body: String,
) -> Result<db::PresentationSlide, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let slide = db::save_presentation_slide(&conn, id, &title, &body).map_err(db_error)?;
    if let Some(urutan_id) = current_urutan_if_refs_item(&app, slide.item_id) {
        reload_if_current(&app, &state, urutan_id)?;
    }
    Ok(slide)
}

#[tauri::command]
pub fn delete_slide(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    id: i64,
) -> Result<(), String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let item_id = conn
        .query_row(
            "SELECT item_id FROM presentation_slide WHERE id = ?1",
            rusqlite::params![id],
            |r| r.get::<_, i64>(0),
        )
        .ok();
    db::delete_presentation_slide(&conn, id).map_err(db_error)?;
    if let Some(item_id) = item_id {
        if let Some(urutan_id) = current_urutan_if_refs_item(&app, item_id) {
            reload_if_current(&app, &state, urutan_id)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn move_slide(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    item_id: i64,
    slide_id: i64,
    new_position: i64,
) -> Result<(), String> {
    let mut conn = db::connect(&app).map_err(db_error)?;
    db::move_presentation_slide(&mut conn, item_id, slide_id, new_position).map_err(db_error)?;
    if let Some(urutan_id) = current_urutan_if_refs_item(&app, item_id) {
        reload_if_current(&app, &state, urutan_id)?;
    }
    Ok(())
}

#[tauri::command]
pub fn list_tags(app: AppHandle) -> Result<Vec<db::Tag>, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::list_tags(&conn).map_err(db_error)
}

#[tauri::command]
pub fn add_item_tag(app: AppHandle, item_id: i64, name: String) -> Result<db::Tag, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::add_item_tag(&conn, item_id, &name).map_err(db_error)
}

#[tauri::command]
pub fn remove_item_tag(app: AppHandle, item_id: i64, tag_id: i64) -> Result<(), String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::remove_item_tag(&conn, item_id, tag_id).map_err(db_error)
}

#[tauri::command]
pub fn add_library_item_to_urutan(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    urutan_id: i64,
    library_item_id: i64,
) -> Result<db::Item, String> {
    let conn = db::connect(&app).map_err(db_error)?;
    let mut item =
        db::add_library_item_to_urutan(&conn, urutan_id, library_item_id).map_err(db_error)?;
    resolve_item_paths(&app, std::slice::from_mut(&mut item));
    reload_if_current(&app, &state, urutan_id)?;
    Ok(item)
}

/* ---------- Media (phase 1.9) ---------- */

#[tauri::command]
pub fn import_media(app: AppHandle) -> Result<db::LibraryItem, String> {
    let file = app
        .dialog()
        .file()
        .add_filter(
            "Media",
            &["png", "jpg", "jpeg", "gif", "webp", "mp4", "mov", "webm", "mkv"],
        )
        .blocking_pick_file()
        .ok_or_else(|| "dibatalkan".to_string())?;
    let path = file.into_path().map_err(|e| e.to_string())?;
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let media_type = if matches!(ext.as_str(), "mp4" | "mov" | "webm" | "mkv") {
        "video"
    } else {
        "image"
    };
    let file_name = path
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("media")
        .to_string();
    let title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Media")
        .to_string();
    let stored = unique_name(&ext);

    let media_dir = app.path().app_data_dir().unwrap().join("media");
    std::fs::create_dir_all(&media_dir).map_err(|e| e.to_string())?;
    std::fs::copy(&path, media_dir.join(&stored)).map_err(|e| e.to_string())?;

    let conn = db::connect(&app).map_err(db_error)?;
    db::create_media(&conn, &title, media_type, &file_name, &stored).map_err(db_error)
}

#[tauri::command]
pub fn set_slide_background(
    app: AppHandle,
    state: State<'_, Mutex<LiveState>>,
    slide_id: i64,
    media_item_id: Option<i64>,
) -> Result<(), String> {
    let conn = db::connect(&app).map_err(db_error)?;
    db::set_slide_background(&conn, slide_id, media_item_id).map_err(db_error)?;
    let item_id: Option<i64> = conn
        .query_row(
            "SELECT item_id FROM presentation_slide WHERE id = ?1",
            rusqlite::params![slide_id],
            |r| r.get(0),
        )
        .ok();
    if let Some(item_id) = item_id {
        if let Some(urutan_id) = current_urutan_if_refs_item(&app, item_id) {
            reload_if_current(&app, &state, urutan_id)?;
        }
    }
    Ok(())
}
