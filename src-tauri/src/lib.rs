mod db;
mod mischief;
mod tray;
mod world;

use tauri::{Manager, RunEvent, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db::DB_URL, db::migrations())
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--background"])))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(world::WorldState::default())
        .invoke_handler(tauri::generate_handler![
            world::world_set_hitboxes,
            world::world_set_capture,
            world::world_set_cursor_feed,
            world::world_monitors,
            world::world_place,
            world::world_show,
            world::world_hide,
            world::world_focus,
            world::world_log,
            mischief::world_set_cursor,
            mischief::world_close_tab,
            tray::app_open_main,
            tray::app_launch_args,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            tray::build(&handle)?;
            if let Some(w) = app.get_webview_window(world::WORLD) {
                // Click-through until the frontend reports hitboxes.
                let _ = w.set_ignore_cursor_events(true);
            }
            let _ = world::world_place(handle.clone(), 0);
            world::start_hit_test_loop(handle.clone());
            // Launched at login: stay in the tray, keep the characters, skip the main window.
            if std::env::args().any(|a| a == "--background") {
                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window keeps the couple on the desktop; Quit lives in the tray.
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Together Desktop");

    app.run(|handle, event| {
        #[cfg(target_os = "macos")]
        if let RunEvent::Reopen { .. } = event {
            tray::show_main(handle);
        }
        let _ = (handle, &event);
    });
}
