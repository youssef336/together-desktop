//! The desktop world: one transparent, borderless, always-on-top window that covers
//! the work area of a monitor. It is click-through everywhere except over the
//! characters — a background thread compares the cursor with the hitboxes the
//! frontend reports and toggles `set_ignore_cursor_events` only when that changes.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Runtime, WebviewWindow};

pub const WORLD: &str = "world";

#[derive(Clone, Copy, Debug, Deserialize)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

#[derive(Default)]
pub struct WorldState {
    hitboxes: Mutex<Vec<Rect>>,
    /// While dragging, keep capturing even if the cursor outruns the hitbox.
    capture: AtomicBool,
    /// Send the cursor position to the world (for hover reactions).
    cursor_feed: AtomicBool,
}

#[derive(Serialize)]
pub struct MonitorInfo {
    index: usize,
    name: String,
    width: u32,
    height: u32,
    primary: bool,
}

#[derive(Clone, Serialize)]
struct CursorPayload {
    x: f64,
    y: f64,
}

fn world<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
    app.get_webview_window(WORLD)
}

#[tauri::command]
pub fn world_set_hitboxes(state: tauri::State<'_, WorldState>, rects: Vec<Rect>) {
    if let Ok(mut h) = state.hitboxes.lock() {
        *h = rects;
    }
}

#[tauri::command]
pub fn world_set_capture(state: tauri::State<'_, WorldState>, capture: bool) {
    state.capture.store(capture, Ordering::Relaxed);
}

#[tauri::command]
pub fn world_set_cursor_feed(state: tauri::State<'_, WorldState>, enabled: bool) {
    state.cursor_feed.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
pub fn world_monitors<R: Runtime>(app: AppHandle<R>) -> Result<Vec<MonitorInfo>, String> {
    let primary = app.primary_monitor().map_err(|e| e.to_string())?;
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    Ok(monitors
        .iter()
        .enumerate()
        .map(|(index, m)| MonitorInfo {
            index,
            name: m.name().cloned().unwrap_or_else(|| format!("Display {}", index + 1)),
            width: m.size().width,
            height: m.size().height,
            primary: primary.as_ref().map(|p| p.position() == m.position()).unwrap_or(index == 0),
        })
        .collect())
}

/// Covers the work area (screen minus taskbar / menu bar / Dock) of the chosen monitor.
#[tauri::command]
pub fn world_place<R: Runtime>(app: AppHandle<R>, index: usize) -> Result<(), String> {
    let win = world(&app).ok_or("world window missing")?;
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let monitor = match monitors.get(index) {
        Some(m) => m.clone(),
        None => app
            .primary_monitor()
            .map_err(|e| e.to_string())?
            .ok_or("no monitor")?,
    };
    let area = monitor.work_area();
    win.set_position(PhysicalPosition::new(area.position.x, area.position.y))
        .map_err(|e| e.to_string())?;
    win.set_size(PhysicalSize::new(area.size.width, area.size.height))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn world_show<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    show_world(&app);
    Ok(())
}

/// Dev aid: lets the world window print to the terminal running `tauri dev`.
#[tauri::command]
pub fn world_log(msg: String) {
    #[cfg(debug_assertions)]
    println!("[world] {msg}");
    #[cfg(not(debug_assertions))]
    let _ = msg;
}

/// Games need the keyboard; the world never takes focus otherwise.
#[tauri::command]
pub fn world_focus<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let win = world(&app).ok_or("world window missing")?;
    win.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn world_hide<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    hide_world(&app);
    Ok(())
}

pub fn show_world<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = world(app) {
        let _ = w.show();
        let _ = w.set_always_on_top(true);
        let _ = w.emit("together://command", "shown");
    }
}

pub fn hide_world<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = world(app) {
        let _ = w.emit("together://command", "hidden");
        let _ = w.hide();
    }
}

/// Starts the click-through loop. ~60 Hz while the world is visible, 4 Hz when hidden.
pub fn start_hit_test_loop<R: Runtime>(app: AppHandle<R>) {
    thread::spawn(move || {
        let mut interactive = true; // unknown at start → force the first update
        let mut last_cursor = (f64::NAN, f64::NAN);
        let mut tick: u32 = 0;
        loop {
            let Some(win) = world(&app) else {
                thread::sleep(Duration::from_millis(250));
                continue;
            };
            if !win.is_visible().unwrap_or(false) {
                thread::sleep(Duration::from_millis(250));
                continue;
            }
            tick = tick.wrapping_add(1);
            let state = app.state::<WorldState>();
            let (Ok(cursor), Ok(origin), Ok(scale)) =
                (win.cursor_position(), win.outer_position(), win.scale_factor())
            else {
                thread::sleep(Duration::from_millis(100));
                continue;
            };
            let x = (cursor.x - origin.x as f64) / scale;
            let y = (cursor.y - origin.y as f64) / scale;

            let over = state.capture.load(Ordering::Relaxed)
                || state
                    .hitboxes
                    .lock()
                    .map(|h| h.iter().any(|r| x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h))
                    .unwrap_or(false);
            if over != interactive {
                if win.set_ignore_cursor_events(!over).is_ok() {
                    interactive = over;
                }
            }

            // Hover feed at ~10 Hz, only when the position changed.
            if state.cursor_feed.load(Ordering::Relaxed)
                && tick % 6 == 0
                && ((x - last_cursor.0).abs() > 1.0 || (y - last_cursor.1).abs() > 1.0)
            {
                last_cursor = (x, y);
                let _ = win.emit("together://cursor", CursorPayload { x, y });
            }
            thread::sleep(Duration::from_millis(16));
        }
    });
}
