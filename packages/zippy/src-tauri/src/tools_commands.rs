use crate::tools::{self, DeviceInfo, RecordMeta, ScreenshotResult, ToolsError};
use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};

pub struct LogStreamState {
    pub child: Mutex<Option<Child>>,
}

impl LogStreamState {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }
}

pub struct RecordStreamState {
    pub child: Mutex<Option<Child>>,
    pub meta: Mutex<Option<RecordMeta>>,
}

impl RecordStreamState {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            meta: Mutex::new(None),
        }
    }
}

fn stop_child_locked(child_slot: &mut Option<Child>) {
    if let Some(mut child) = child_slot.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

#[tauri::command]
pub fn tools_list_devices() -> Result<Vec<DeviceInfo>, ToolsError> {
    tools::list_devices()
}

#[tauri::command]
pub fn tools_list_avds() -> Result<Vec<String>, ToolsError> {
    tools::list_avds()
}

#[tauri::command]
pub fn tools_adb_forward(serial: Option<String>, port: Option<u16>) -> Result<String, ToolsError> {
    let port = port.unwrap_or(9876);
    tools::adb_forward(serial.as_deref(), port)
}

#[tauri::command]
pub fn tools_adb_forward_remove(
    serial: Option<String>,
    port: Option<u16>,
) -> Result<String, ToolsError> {
    let port = port.unwrap_or(9876);
    tools::adb_forward_remove(serial.as_deref(), port)
}

#[tauri::command]
pub fn tools_adb_reverse(serial: Option<String>, port: Option<u16>) -> Result<String, ToolsError> {
    let port = port.unwrap_or(8081);
    tools::adb_reverse(serial.as_deref(), port)
}

#[tauri::command]
pub fn tools_adb_reverse_remove(
    serial: Option<String>,
    port: Option<u16>,
) -> Result<String, ToolsError> {
    let port = port.unwrap_or(8081);
    tools::adb_reverse_remove(serial.as_deref(), port)
}

#[tauri::command]
pub fn tools_screenshot(device_id: String) -> Result<ScreenshotResult, ToolsError> {
    tools::screenshot(&device_id)
}

#[tauri::command]
pub fn tools_save_file(path: String, base64: String) -> Result<String, ToolsError> {
    tools::save_base64_file(&path, &base64)
}

#[tauri::command]
pub fn tools_install(device_id: String, path: String) -> Result<String, ToolsError> {
    tools::install(&device_id, &path)
}

#[tauri::command]
pub fn tools_uninstall(device_id: String, package_id: String) -> Result<String, ToolsError> {
    tools::uninstall(&device_id, &package_id)
}

#[tauri::command]
pub fn tools_add_media(device_id: String, path: String) -> Result<String, ToolsError> {
    tools::add_media(&device_id, &path)
}

#[tauri::command]
pub fn tools_open_url(device_id: String, url: String) -> Result<String, ToolsError> {
    tools::open_url(&device_id, &url)
}

#[tauri::command]
pub fn tools_clear_data(device_id: String, package_id: String) -> Result<String, ToolsError> {
    tools::clear_app_data(&device_id, &package_id)
}

#[tauri::command]
pub fn tools_force_stop(device_id: String, package_id: String) -> Result<String, ToolsError> {
    tools::force_stop(&device_id, &package_id)
}

#[tauri::command]
pub fn tools_launch_app(device_id: String, package_id: String) -> Result<String, ToolsError> {
    tools::launch_app(&device_id, &package_id)
}

#[tauri::command]
pub fn tools_restart_app(device_id: String, package_id: String) -> Result<String, ToolsError> {
    tools::restart_app(&device_id, &package_id)
}

#[tauri::command]
pub fn tools_permission_set(
    device_id: String,
    package_id: String,
    permission: String,
    grant: bool,
) -> Result<String, ToolsError> {
    tools::permission_set(&device_id, &package_id, &permission, grant)
}

#[tauri::command]
pub fn tools_set_location(device_id: String, lat: f64, lon: f64) -> Result<String, ToolsError> {
    tools::set_location(&device_id, lat, lon)
}

#[tauri::command]
pub fn tools_set_appearance(device_id: String, mode: String) -> Result<String, ToolsError> {
    tools::set_appearance(&device_id, &mode)
}

#[tauri::command]
pub fn tools_input_text(device_id: String, text: String) -> Result<String, ToolsError> {
    tools::input_text(&device_id, &text)
}

#[tauri::command]
pub fn tools_list_packages(device_id: String) -> Result<Vec<String>, ToolsError> {
    tools::list_packages(&device_id)
}

#[tauri::command]
pub fn tools_boot_device(device_id: String) -> Result<String, ToolsError> {
    tools::boot_device(&device_id)
}

#[tauri::command]
pub fn tools_shutdown_device(device_id: String) -> Result<String, ToolsError> {
    tools::shutdown_device(&device_id)
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogBatchPayload {
    lines: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogStatusPayload {
    running: bool,
    message: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecordStatusPayload {
    running: bool,
    path: Option<String>,
    message: Option<String>,
}

fn flush_log_batch(app: &AppHandle, lines: &mut Vec<String>) {
    if lines.is_empty() {
        return;
    }
    let batch = std::mem::take(lines);
    let _ = app.emit("tools:log-batch", LogBatchPayload { lines: batch });
}

#[tauri::command]
pub fn tools_log_start(
    app: AppHandle,
    state: State<'_, LogStreamState>,
    device_id: String,
    filter: Option<String>,
) -> Result<(), ToolsError> {
    let device = tools::find_device(&device_id)?;
    let mut slot = state
        .child
        .lock()
        .map_err(|_| ToolsError::Message("log stream lock poisoned".into()))?;
    stop_child_locked(&mut slot);

    let mut child = tools::spawn_log_process(&device, filter.as_deref())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| ToolsError::Message("log stream stdout unavailable".into()))?;
    let stderr = child.stderr.take();

    *slot = Some(child);
    drop(slot);

    let app_out = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut batch: Vec<String> = Vec::with_capacity(64);
        let mut last_flush = Instant::now();
        for line in reader.lines() {
            match line {
                Ok(text) => {
                    batch.push(text);
                    if batch.len() >= 50 || last_flush.elapsed() >= Duration::from_millis(80) {
                        flush_log_batch(&app_out, &mut batch);
                        last_flush = Instant::now();
                    }
                }
                Err(_) => break,
            }
        }
        flush_log_batch(&app_out, &mut batch);
        let _ = app_out.emit(
            "tools:log-status",
            LogStatusPayload {
                running: false,
                message: Some("log stream ended".into()),
            },
        );
    });

    if let Some(stderr) = stderr {
        let app_err = app.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            let mut batch: Vec<String> = Vec::new();
            let mut last_flush = Instant::now();
            for line in reader.lines().flatten() {
                if line.trim().is_empty() {
                    continue;
                }
                batch.push(format!("[stderr] {line}"));
                if batch.len() >= 20 || last_flush.elapsed() >= Duration::from_millis(80) {
                    flush_log_batch(&app_err, &mut batch);
                    last_flush = Instant::now();
                }
            }
            flush_log_batch(&app_err, &mut batch);
        });
    }

    let _ = app.emit(
        "tools:log-status",
        LogStatusPayload {
            running: true,
            message: None,
        },
    );
    Ok(())
}

#[tauri::command]
pub fn tools_log_stop(app: AppHandle, state: State<'_, LogStreamState>) -> Result<(), ToolsError> {
    let mut slot = state
        .child
        .lock()
        .map_err(|_| ToolsError::Message("log stream lock poisoned".into()))?;
    stop_child_locked(&mut slot);
    let _ = app.emit(
        "tools:log-status",
        LogStatusPayload {
            running: false,
            message: Some("stopped".into()),
        },
    );
    Ok(())
}

#[tauri::command]
pub fn tools_record_start(
    app: AppHandle,
    state: State<'_, RecordStreamState>,
    device_id: String,
) -> Result<(), ToolsError> {
    let mut child_slot = state
        .child
        .lock()
        .map_err(|_| ToolsError::Message("record lock poisoned".into()))?;
    let mut meta_slot = state
        .meta
        .lock()
        .map_err(|_| ToolsError::Message("record meta lock poisoned".into()))?;
    stop_child_locked(&mut child_slot);
    *meta_slot = None;

    let (child, meta) = tools::start_record(&device_id)?;
    *child_slot = Some(child);
    *meta_slot = Some(meta);
    let _ = app.emit(
        "tools:record-status",
        RecordStatusPayload {
            running: true,
            path: None,
            message: Some("recording…".into()),
        },
    );
    Ok(())
}

#[tauri::command]
pub fn tools_record_stop(
    app: AppHandle,
    state: State<'_, RecordStreamState>,
) -> Result<String, ToolsError> {
    let mut child_slot = state
        .child
        .lock()
        .map_err(|_| ToolsError::Message("record lock poisoned".into()))?;
    let mut meta_slot = state
        .meta
        .lock()
        .map_err(|_| ToolsError::Message("record meta lock poisoned".into()))?;

    // Prefer graceful interrupt for simctl recordVideo / adb screenrecord.
    if let Some(mut child) = child_slot.take() {
        let pid = child.id().to_string();
        let _ = Command::new("kill").args(["-SIGINT", &pid]).status();
        // Fallback if still running.
        let _ = child.kill();
        let _ = child.wait();
    }

    let meta = meta_slot
        .take()
        .ok_or_else(|| ToolsError::Message("no active recording".into()))?;
    let path = tools::finalize_record(&meta)?;
    let _ = app.emit(
        "tools:record-status",
        RecordStatusPayload {
            running: false,
            path: Some(path.clone()),
            message: Some("recording saved".into()),
        },
    );
    Ok(path)
}
