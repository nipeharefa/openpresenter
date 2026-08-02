use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

use crate::db;
use crate::state::{LiveItem, LiveState, LiveView};

fn emit_view(app: &AppHandle, state: &LiveState) -> Result<(), String> {
    app.emit("live:changed", state.view()).map_err(|e| e.to_string())
}

fn db_error(e: rusqlite::Error) -> String {
    format!("db: {e}")
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
    let items = db::list_items(&conn, id).map_err(db_error)?;
    db::set_meta(&conn, "last_urutan", &id.to_string()).map_err(db_error)?;

    let mut live = state.lock().unwrap();
    live.urutan_id = Some(id);
    live.urutan_name = Some(urutan.name.clone());
    live.items = items
        .into_iter()
        .map(|item| LiveItem {
            id: item.id,
            title: item.title,
            text: item.text,
        })
        .collect();
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
    let item = db::save_item(&conn, id, &title, &text).map_err(db_error)?;
    let mut live = state.lock().unwrap();
    if live.urutan_id == Some(item.urutan_id) {
        if let Some(current) = live.items.iter_mut().find(|i| i.id == id) {
            current.title = item.title.clone();
            current.text = item.text.clone();
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
pub fn open_projection(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("projection") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, "projection", WebviewUrl::App("index.html".into()))
        .title("OpenPresenter - Proyeksi")
        .inner_size(1280.0, 720.0)
        .fullscreen(true)
        .background_color(tauri::window::Color(0, 0, 0, 255))
        .build()
        .map_err(|e| e.to_string())?;
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
    let items = db::list_items(&conn, urutan_id).map_err(db_error)?;
    live.items = items
        .into_iter()
        .map(|item| LiveItem {
            id: item.id,
            title: item.title,
            text: item.text,
        })
        .collect();
    if live.item_index >= live.items.len() {
        live.item_index = live.items.len().saturating_sub(1);
    }
    if live.slide_index >= live.slide_count() {
        live.slide_index = live.slide_count().saturating_sub(1);
    }
    emit_view(app, &live)
}
