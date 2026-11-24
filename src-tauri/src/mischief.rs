//! Mischief (opt-in per character): the world can move the real mouse cursor while a character
//! "holds" it, and close the front browser tab. Both are only ever triggered by the world window
//! when the user has switched mischief on for that character.

use tauri::{AppHandle, LogicalPosition, Manager, Runtime};

use crate::world::WORLD;

/// Moves the cursor to a point in world-window CSS pixels (= logical pixels of that window).
#[tauri::command]
pub fn world_set_cursor<R: Runtime>(app: AppHandle<R>, x: f64, y: f64) -> Result<(), String> {
    let win = app.get_webview_window(WORLD).ok_or("world window missing")?;
    win.set_cursor_position(LogicalPosition::new(x, y))
        .map_err(|e| e.to_string())
}

/// Closes the front tab with ⌘W / Ctrl+W, but only if the front app is a web browser.
/// Returns `closed`, or `skip:<front app>`; an error means the OS refused (macOS permissions).
#[tauri::command]
pub async fn world_close_tab() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(close_front_tab)
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(target_os = "macos")]
const MAC_SCRIPT: &str = r#"
tell application "System Events"
  set fp to first application process whose frontmost is true
  set bid to bundle identifier of fp
end tell
set browsers to {"com.google.Chrome", "com.apple.Safari", "org.mozilla.firefox", "com.microsoft.edgemac", "com.brave.Browser", "company.thebrowser.Browser", "com.operasoftware.Opera", "com.vivaldi.Vivaldi"}
if browsers contains bid then
  tell application "System Events" to keystroke "w" using command down
  return "closed"
end if
return "skip:" & bid
"#;

#[cfg(target_os = "macos")]
fn close_front_tab() -> Result<String, String> {
    let out = std::process::Command::new("osascript")
        .arg("-e")
        .arg(MAC_SCRIPT)
        .output()
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

#[cfg(target_os = "windows")]
const WIN_SCRIPT: &str = r#"
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class Fg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
}
'@
$h = [Fg]::GetForegroundWindow(); $procId = 0
[void][Fg]::GetWindowThreadProcessId($h, [ref]$procId)
$name = (Get-Process -Id $procId).ProcessName.ToLower()
if (@('chrome','msedge','firefox','brave','opera','vivaldi','arc') -contains $name) {
  (New-Object -ComObject WScript.Shell).SendKeys('^w'); 'closed'
} else { 'skip:' + $name }
"#;

#[cfg(target_os = "windows")]
fn close_front_tab() -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let out = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", WIN_SCRIPT])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn close_front_tab() -> Result<String, String> {
    Ok("skip:unsupported".into())
}
