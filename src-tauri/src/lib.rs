mod commands;
mod db;
mod monitor;
mod slides;
mod state;

use std::sync::Mutex;

use tauri::{Manager, WindowEvent};
use state::LiveState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(LiveState::new()))
        .on_window_event(|window, event| {
            if window.label() == "projection"
                && matches!(event, WindowEvent::CloseRequested { .. })
            {
                commands::on_projection_close(window);
            }
        })
        .setup(|app| {
            let handle = app.handle();
            let conn = db::connect(handle).map_err(|e| e.to_string())?;
            if let Some(id_str) = db::get_meta(&conn, "last_urutan")? {
                if let Ok(id) = id_str.parse::<i64>() {
                    if let Some(urutan) = db::get_urutan(&conn, id)? {
                        let items = db::list_items(&conn, id)?;
                        let state = app.state::<Mutex<LiveState>>();
                        let mut live = state.lock().unwrap();
                        live.urutan_id = Some(id);
                        live.urutan_name = Some(urutan.name);
                        live.items = items
                            .into_iter()
                            .map(|item| state::LiveItem {
                                id: item.id,
                                title: item.title,
                                text: item.text,
                            })
                            .collect();
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_urutan,
            commands::create_urutan,
            commands::delete_urutan,
            commands::load_urutan,
            commands::add_item,
            commands::save_item,
            commands::delete_item,
            commands::move_item,
            commands::next_slide,
            commands::prev_slide,
            commands::jump_item,
            commands::toggle_black,
            commands::get_live,
            commands::open_projection,
            commands::close_projection,
            commands::get_projection_open,
            commands::list_monitors,
            commands::set_projection_monitor,
            commands::get_projection_monitor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
