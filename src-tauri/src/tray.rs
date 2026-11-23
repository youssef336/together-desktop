//! Native tray (Windows notification area / macOS menu bar).

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::world::{hide_world, show_world, WORLD};

const ACTIVITIES: [(&str, &str); 8] = [
    ("coffee", "Coffee together"),
    ("hug", "Hug"),
    ("dance", "Dance"),
    ("walk", "Walk together"),
    ("sit", "Sit together"),
    ("sleep", "Nap together"),
    ("play", "Play a game"),
    ("talk", "Talk"),
];

pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[tauri::command]
pub fn app_open_main<R: Runtime>(app: AppHandle<R>, view: Option<String>) {
    show_main(&app);
    if let Some(view) = view {
        let _ = app.emit_to("main", "together://navigate", view);
    }
}

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Together", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show characters", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide characters", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "Pause / resume", true, None::<&str>)?;
    let items = ACTIVITIES
        .iter()
        .map(|(id, label)| MenuItem::with_id(app, format!("activity:{id}"), *label, true, None::<&str>))
        .collect::<tauri::Result<Vec<_>>>()?;
    let refs: Vec<&dyn tauri::menu::IsMenuItem<R>> = items.iter().map(|i| i as _).collect();
    let activities = Submenu::with_items(app, "Start activity", true, &refs)?;
    let who_items = [("show:both", "Both of them"), ("show:a", "Only the first"), ("show:b", "Only the second")]
        .iter()
        .map(|(id, label)| MenuItem::with_id(app, *id, *label, true, None::<&str>))
        .collect::<tauri::Result<Vec<_>>>()?;
    let who_refs: Vec<&dyn tauri::menu::IsMenuItem<R>> = who_items.iter().map(|i| i as _).collect();
    let who = Submenu::with_items(app, "Who's out", true, &who_refs)?;
    let game_items = [
        ("game:coffee-catch", "Coffee Catch"),
        ("game:heart-pop", "Heart Pop"),
        ("game:copy-me", "Copy Me"),
        ("game:rps", "Rock Paper Scissors"),
    ]
    .iter()
    .map(|(id, label)| MenuItem::with_id(app, *id, *label, true, None::<&str>))
    .collect::<tauri::Result<Vec<_>>>()?;
    let game_refs: Vec<&dyn tauri::menu::IsMenuItem<R>> = game_items.iter().map(|i| i as _).collect();
    let games = Submenu::with_items(app, "Play a game", true, &game_refs)?;
    let settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Together", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(
        app,
        &[&open, &sep1, &show, &hide, &pause, &who, &activities, &games, &sep2, &settings, &quit],
    )?;

    let icon = Image::from_bytes(include_bytes!("../icons/tray.png"))?;
    TrayIconBuilder::with_id("together")
        .icon(icon)
        .icon_as_template(true)
        .tooltip("Together Desktop")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "open" => show_main(app),
                "show" => show_world(app),
                "hide" => hide_world(app),
                "pause" => {
                    let _ = app.emit_to(WORLD, "together://command", "toggle-pause");
                }
                "settings" => {
                    show_main(app);
                    let _ = app.emit_to("main", "together://navigate", "settings");
                }
                "quit" => app.exit(0),
                other => {
                    if other.starts_with("show:") {
                        show_world(app);
                        let _ = app.emit_to(WORLD, "together://command", other);
                    } else if let Some(game) = other.strip_prefix("game:") {
                        show_world(app);
                        let _ = app.emit_to(WORLD, "together://game", serde_json::json!({ "id": game }));
                    } else if let Some(activity) = other.strip_prefix("activity:") {
                        show_world(app);
                        let _ = app.emit_to(WORLD, "together://activity", activity);
                    }
                }
            }
        })
        .build(app)?;
    Ok(())
}
