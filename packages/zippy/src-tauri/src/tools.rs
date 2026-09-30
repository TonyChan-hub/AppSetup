use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};
use std::time::Duration;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ToolsError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

impl Serialize for ToolsError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub state: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotResult {
    pub mime: String,
    pub base64: String,
}

fn expand_home(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    }
    PathBuf::from(path)
}

fn is_executable(path: &Path) -> bool {
    path.is_file()
}

pub fn resolve_adb() -> Result<PathBuf, ToolsError> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    for env_key in ["ANDROID_HOME", "ANDROID_SDK_ROOT"] {
        if let Ok(root) = std::env::var(env_key) {
            if !root.trim().is_empty() {
                candidates.push(PathBuf::from(root.trim()).join("platform-tools/adb"));
            }
        }
    }

    candidates.push(expand_home("~/Library/Android/sdk/platform-tools/adb"));
    candidates.push(PathBuf::from("/opt/homebrew/bin/adb"));
    candidates.push(PathBuf::from("/usr/local/bin/adb"));

    for path in &candidates {
        if is_executable(path) {
            return Ok(path.clone());
        }
    }

    if let Ok(output) = Command::new("which").arg("adb").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                let p = PathBuf::from(&path);
                if is_executable(&p) {
                    return Ok(p);
                }
            }
        }
    }

    Err(ToolsError::Message(
        "adb not found. Install Android platform-tools or set ANDROID_HOME.".into(),
    ))
}

pub fn resolve_xcrun() -> Result<PathBuf, ToolsError> {
    let candidates = [
        PathBuf::from("/usr/bin/xcrun"),
        PathBuf::from("/usr/local/bin/xcrun"),
    ];
    for path in &candidates {
        if is_executable(path) {
            return Ok(path.clone());
        }
    }
    if let Ok(output) = Command::new("which").arg("xcrun").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                let p = PathBuf::from(&path);
                if is_executable(&p) {
                    return Ok(p);
                }
            }
        }
    }
    Err(ToolsError::Message(
        "xcrun not found. Install Xcode command line tools.".into(),
    ))
}

fn output_message(output: &Output, fallback: &str) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !stderr.is_empty() {
        stderr
    } else if !stdout.is_empty() {
        stdout
    } else {
        fallback.to_string()
    }
}

fn run_capture(bin: &Path, args: &[&str]) -> Result<Output, ToolsError> {
    Command::new(bin)
        .args(args)
        .output()
        .map_err(|e| ToolsError::Message(format!("failed to run {}: {e}", bin.display())))
}

fn run_ok(bin: &Path, args: &[&str]) -> Result<String, ToolsError> {
    let output = run_capture(bin, args)?;
    if !output.status.success() {
        return Err(ToolsError::Message(output_message(
            &output,
            &format!("{} {:?} failed", bin.display(), args),
        )));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn validate_device_id(id: &str) -> Result<(), ToolsError> {
    let trimmed = id.trim();
    if trimmed.is_empty() {
        return Err(ToolsError::Message("device id is required".into()));
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.' | ':'))
    {
        return Err(ToolsError::Message(
            "device id contains invalid characters".into(),
        ));
    }
    Ok(())
}

pub fn validate_package_id(id: &str) -> Result<(), ToolsError> {
    let trimmed = id.trim();
    let ok = trimmed
        .chars()
        .enumerate()
        .all(|(i, c)| {
            if i == 0 {
                c.is_ascii_alphabetic()
            } else {
                c.is_ascii_alphanumeric() || matches!(c, '.' | '_')
            }
        })
        && !trimmed.is_empty();
    if !ok {
        return Err(ToolsError::Message(
            "package id must match ^[A-Za-z][A-Za-z0-9._]*$".into(),
        ));
    }
    Ok(())
}

pub fn validate_log_filter(filter: &str) -> Result<(), ToolsError> {
    if filter
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '*' | ':' | '.' | '_' | ' ' | '|' | '-'))
    {
        Ok(())
    } else {
        Err(ToolsError::Message(
            "log filter contains invalid characters".into(),
        ))
    }
}

pub fn validate_port(port: u16) -> Result<(), ToolsError> {
    if port == 0 {
        Err(ToolsError::Message("port must be > 0".into()))
    } else {
        Ok(())
    }
}

fn parse_adb_devices(stdout: &str) -> Vec<DeviceInfo> {
    let mut devices = Vec::new();
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("List of devices") {
            continue;
        }
        let mut parts = line.split_whitespace();
        let Some(id) = parts.next() else { continue };
        let Some(state) = parts.next() else { continue };
        if state == "offline" || state == "unauthorized" {
            devices.push(DeviceInfo {
                id: id.to_string(),
                name: id.to_string(),
                platform: "android".into(),
                state: state.to_string(),
            });
            continue;
        }
        if state != "device" {
            continue;
        }
        let mut model = id.to_string();
        for token in parts {
            if let Some(value) = token.strip_prefix("model:") {
                model = value.replace('_', " ");
                break;
            }
            if let Some(value) = token.strip_prefix("product:") {
                model = value.to_string();
            }
        }
        devices.push(DeviceInfo {
            id: id.to_string(),
            name: model,
            platform: "android".into(),
            state: "device".into(),
        });
    }
    devices
}

fn parse_simctl_devices(json: &str) -> Result<Vec<DeviceInfo>, ToolsError> {
    let value: Value = serde_json::from_str(json)
        .map_err(|e| ToolsError::Message(format!("simctl json parse failed: {e}")))?;
    let mut devices = Vec::new();
    let Some(map) = value.get("devices").and_then(|v| v.as_object()) else {
        return Ok(devices);
    };
    for (runtime, list) in map {
        let Some(arr) = list.as_array() else { continue };
        let runtime_label = runtime
            .rsplit('.')
            .next()
            .unwrap_or(runtime)
            .replace('-', " ");
        for item in arr {
            let available = item
                .get("isAvailable")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            if !available {
                continue;
            }
            let id = item
                .get("udid")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let name = item
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Simulator")
                .to_string();
            let state = item
                .get("state")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .to_string();
            if id.is_empty() {
                continue;
            }
            devices.push(DeviceInfo {
                id,
                name: format!("{name} ({runtime_label})"),
                platform: "ios-sim".into(),
                state,
            });
        }
    }
    devices.sort_by(|a, b| {
        let a_boot = a.state == "Booted";
        let b_boot = b.state == "Booted";
        b_boot.cmp(&a_boot).then_with(|| a.name.cmp(&b.name))
    });
    Ok(devices)
}

pub fn list_devices() -> Result<Vec<DeviceInfo>, ToolsError> {
    let mut devices = Vec::new();

    match resolve_adb() {
        Ok(adb) => match run_ok(&adb, &["devices", "-l"]) {
            Ok(out) => devices.extend(parse_adb_devices(&out)),
            Err(err) => {
                // Still try simulators; surface adb error only if both fail later.
                let _ = err;
            }
        },
        Err(_) => {}
    }

    let mut simctl_error: Option<ToolsError> = None;
    match resolve_xcrun() {
        Ok(xcrun) => match run_ok(
            &xcrun,
            &["simctl", "list", "devices", "available", "-j"],
        ) {
            Ok(out) => devices.extend(parse_simctl_devices(&out)?),
            Err(err) => simctl_error = Some(err),
        },
        Err(err) => simctl_error = Some(err),
    }

    if devices.is_empty() {
        if let Some(err) = simctl_error {
            return Err(ToolsError::Message(format!(
                "No devices found. adb/simctl unavailable: {err}"
            )));
        }
    }

    Ok(devices)
}

pub fn find_device(device_id: &str) -> Result<DeviceInfo, ToolsError> {
    validate_device_id(device_id)?;
    list_devices()?
        .into_iter()
        .find(|d| d.id == device_id)
        .ok_or_else(|| ToolsError::Message(format!("device not found: {device_id}")))
}

pub fn adb_forward(serial: Option<&str>, port: u16) -> Result<String, ToolsError> {
    validate_port(port)?;
    let adb = resolve_adb()?;
    let port_arg = format!("tcp:{port}");
    let mut cmd = Command::new(&adb);
    if let Some(s) = serial.filter(|s| !s.trim().is_empty()) {
        validate_device_id(s)?;
        cmd.arg("-s").arg(s.trim());
    }
    let output = cmd
        .arg("forward")
        .arg(&port_arg)
        .arg(&port_arg)
        .output()
        .map_err(|e| ToolsError::Message(format!("failed to run adb forward: {e}")))?;
    if !output.status.success() {
        return Err(ToolsError::Message(output_message(
            &output,
            "adb forward failed",
        )));
    }
    Ok(format!("forwarded {port_arg} -> {port_arg}"))
}

pub fn adb_forward_remove(serial: Option<&str>, port: u16) -> Result<String, ToolsError> {
    validate_port(port)?;
    let adb = resolve_adb()?;
    let port_arg = format!("tcp:{port}");
    let mut cmd = Command::new(&adb);
    if let Some(s) = serial.filter(|s| !s.trim().is_empty()) {
        validate_device_id(s)?;
        cmd.arg("-s").arg(s.trim());
    }
    let output = cmd
        .arg("forward")
        .arg("--remove")
        .arg(&port_arg)
        .output()
        .map_err(|e| ToolsError::Message(format!("failed to run adb forward --remove: {e}")))?;
    if !output.status.success() {
        return Err(ToolsError::Message(output_message(
            &output,
            "adb forward --remove failed",
        )));
    }
    Ok(format!("removed forward {port_arg}"))
}

pub fn screenshot(device_id: &str) -> Result<ScreenshotResult, ToolsError> {
    let device = find_device(device_id)?;
    let bytes = if device.platform == "android" {
        let adb = resolve_adb()?;
        let output = run_capture(
            &adb,
            &["-s", device.id.as_str(), "exec-out", "screencap", "-p"],
        )?;
        if !output.status.success() {
            return Err(ToolsError::Message(output_message(
                &output,
                "adb screencap failed",
            )));
        }
        if output.stdout.is_empty() {
            return Err(ToolsError::Message("screenshot returned empty data".into()));
        }
        output.stdout
    } else if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        let temp = std::env::temp_dir().join(format!(
            "zippy-screenshot-{}.png",
            uuid::Uuid::new_v4()
        ));
        let temp_str = temp.to_string_lossy().to_string();
        run_ok(
            &xcrun,
            &[
                "simctl",
                "io",
                device.id.as_str(),
                "screenshot",
                temp_str.as_str(),
            ],
        )?;
        let bytes = fs::read(&temp)?;
        let _ = fs::remove_file(&temp);
        if bytes.is_empty() {
            return Err(ToolsError::Message("screenshot returned empty data".into()));
        }
        bytes
    } else {
        return Err(ToolsError::Message(format!(
            "unsupported platform: {}",
            device.platform
        )));
    };

    Ok(ScreenshotResult {
        mime: "image/png".into(),
        base64: BASE64.encode(bytes),
    })
}

pub fn save_base64_file(path: &str, base64_data: &str) -> Result<String, ToolsError> {
    let path = path.trim();
    if path.is_empty() {
        return Err(ToolsError::Message("save path is required".into()));
    }
    let bytes = BASE64
        .decode(base64_data.trim())
        .map_err(|e| ToolsError::Message(format!("invalid base64: {e}")))?;
    if bytes.is_empty() {
        return Err(ToolsError::Message("empty file data".into()));
    }
    let path_buf = PathBuf::from(path);
    if let Some(parent) = path_buf.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }
    fs::write(&path_buf, bytes)?;
    Ok(format!("saved {}", path_buf.display()))
}

pub fn install(device_id: &str, path: &str) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    let path = path.trim();
    if path.is_empty() {
        return Err(ToolsError::Message("install path is required".into()));
    }
    let path_buf = PathBuf::from(path);
    if !path_buf.exists() {
        return Err(ToolsError::Message(format!("path not found: {path}")));
    }

    if device.platform == "android" {
        if !path.to_ascii_lowercase().ends_with(".apk") {
            return Err(ToolsError::Message("Android install requires a .apk file".into()));
        }
        let adb = resolve_adb()?;
        run_ok(
            &adb,
            &["-s", device.id.as_str(), "install", "-r", path],
        )?;
        Ok(format!("installed {path}"))
    } else if device.platform == "ios-sim" {
        if !path.ends_with(".app") {
            return Err(ToolsError::Message(
                "iOS Simulator install requires a .app bundle".into(),
            ));
        }
        let xcrun = resolve_xcrun()?;
        run_ok(
            &xcrun,
            &["simctl", "install", device.id.as_str(), path],
        )?;
        Ok(format!("installed {path}"))
    } else {
        Err(ToolsError::Message(format!(
            "unsupported platform: {}",
            device.platform
        )))
    }
}

pub fn uninstall(device_id: &str, package_id: &str) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    validate_package_id(package_id)?;
    let package_id = package_id.trim();

    if device.platform == "android" {
        let adb = resolve_adb()?;
        run_ok(
            &adb,
            &["-s", device.id.as_str(), "uninstall", package_id],
        )?;
        Ok(format!("uninstalled {package_id}"))
    } else if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        run_ok(
            &xcrun,
            &[
                "simctl",
                "uninstall",
                device.id.as_str(),
                package_id,
            ],
        )?;
        Ok(format!("uninstalled {package_id}"))
    } else {
        Err(ToolsError::Message(format!(
            "unsupported platform: {}",
            device.platform
        )))
    }
}

pub fn build_log_command(
    device: &DeviceInfo,
    filter: Option<&str>,
) -> Result<(PathBuf, Vec<String>), ToolsError> {
    if let Some(f) = filter {
        if !f.trim().is_empty() {
            validate_log_filter(f.trim())?;
        }
    }

    if device.platform == "android" {
        let adb = resolve_adb()?;
        // -T 1: stream from ~1s ago instead of dumping the entire log buffer
        let mut args = vec![
            "-s".into(),
            device.id.clone(),
            "logcat".into(),
            "-v".into(),
            "time".into(),
            "-T".into(),
            "1".into(),
        ];
        if let Some(f) = filter.map(str::trim).filter(|s| !s.is_empty()) {
            args.push(f.to_string());
        }
        Ok((adb, args))
    } else if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        let mut args = vec![
            "simctl".into(),
            "spawn".into(),
            device.id.clone(),
            "log".into(),
            "stream".into(),
            "--level=default".into(),
            "--style=compact".into(),
        ];
        if let Some(f) = filter.map(str::trim).filter(|s| !s.is_empty()) {
            args.push("--predicate".into());
            // Keep predicate simple and validated: eventMessage CONTAINS "filter"
            args.push(format!("eventMessage CONTAINS \"{f}\""));
        }
        Ok((xcrun, args))
    } else {
        Err(ToolsError::Message(format!(
            "unsupported platform: {}",
            device.platform
        )))
    }
}

pub fn spawn_log_process(
    device: &DeviceInfo,
    filter: Option<&str>,
) -> Result<std::process::Child, ToolsError> {
    let (bin, args) = build_log_command(device, filter)?;
    let arg_refs: Vec<&str> = args.iter().map(String::as_str).collect();
    Command::new(&bin)
        .args(&arg_refs)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|e| ToolsError::Message(format!("failed to start log stream: {e}")))
}

fn validate_url(url: &str) -> Result<(), ToolsError> {
    let url = url.trim();
    if url.is_empty() || url.len() > 2048 {
        return Err(ToolsError::Message("url is required (max 2048 chars)".into()));
    }
    if !url.contains("://") {
        return Err(ToolsError::Message("url must include a scheme (e.g. https:// or myapp://)".into()));
    }
    if !url
        .chars()
        .all(|c| c.is_ascii() && !c.is_control() && c != '\'' && c != '"' && c != '`')
    {
        return Err(ToolsError::Message("url contains invalid characters".into()));
    }
    Ok(())
}

fn validate_input_text(text: &str) -> Result<(), ToolsError> {
    let text = text.trim();
    if text.is_empty() || text.len() > 200 {
        return Err(ToolsError::Message("input text required (max 200 chars)".into()));
    }
    if !text
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, ' ' | '.' | ',' | '-' | '_' | '@' | ':' | '/' | '?' | '=' | '&' | '%' | '+' | '#'))
    {
        return Err(ToolsError::Message(
            "input text allows only simple ASCII".into(),
        ));
    }
    Ok(())
}

fn validate_permission(permission: &str, platform: &str) -> Result<(), ToolsError> {
    let permission = permission.trim();
    if platform == "android" {
        if permission.is_empty()
            || !permission
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_'))
            || !permission.contains('.')
        {
            return Err(ToolsError::Message(
                "android permission must look like android.permission.NAME".into(),
            ));
        }
        return Ok(());
    }
    const IOS_SERVICES: &[&str] = &[
        "all",
        "calendar",
        "contacts-limited",
        "contacts",
        "location",
        "location-always",
        "photos-add",
        "photos",
        "media-library",
        "microphone",
        "motion",
        "reminders",
        "siri",
        "bluetooth",
        "faceid",
        "camera",
        "user-tracking",
        "nearby-interactions",
        "speech-recognition",
        "focus-status",
    ];
    if !IOS_SERVICES.contains(&permission) {
        return Err(ToolsError::Message(format!(
            "unsupported iOS privacy service: {permission}"
        )));
    }
    Ok(())
}

fn validate_appearance(mode: &str) -> Result<(), ToolsError> {
    match mode.trim() {
        "light" | "dark" => Ok(()),
        _ => Err(ToolsError::Message("appearance must be light or dark".into())),
    }
}

fn validate_coords(lat: f64, lon: f64) -> Result<(), ToolsError> {
    if !(-90.0..=90.0).contains(&lat) || !(-180.0..=180.0).contains(&lon) {
        return Err(ToolsError::Message("lat must be [-90,90], lon [-180,180]".into()));
    }
    Ok(())
}

fn adb_shell(device_id: &str, shell_args: &[&str]) -> Result<String, ToolsError> {
    let adb = resolve_adb()?;
    let mut cmd = Command::new(&adb);
    cmd.arg("-s").arg(device_id).arg("shell");
    for a in shell_args {
        cmd.arg(a);
    }
    let output = cmd
        .output()
        .map_err(|e| ToolsError::Message(format!("adb shell failed: {e}")))?;
    if !output.status.success() {
        return Err(ToolsError::Message(output_message(&output, "adb shell failed")));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn add_media(device_id: &str, path: &str) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    let path = path.trim();
    let path_buf = PathBuf::from(path);
    if path.is_empty() || !path_buf.exists() {
        return Err(ToolsError::Message("media file not found".into()));
    }
    let lower = path.to_ascii_lowercase();
    let ok_ext = [".jpg", ".jpeg", ".png", ".gif", ".heic", ".webp", ".mp4", ".mov", ".m4v"]
        .iter()
        .any(|ext| lower.ends_with(ext));
    if !ok_ext {
        return Err(ToolsError::Message(
            "unsupported media type (jpg/png/gif/heic/webp/mp4/mov)".into(),
        ));
    }

    if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        run_ok(
            &xcrun,
            &["simctl", "addmedia", device.id.as_str(), path],
        )?;
        return Ok(format!("added media {path}"));
    }
    if device.platform == "android" {
        let name = path_buf
            .file_name()
            .and_then(|s| s.to_str())
            .ok_or_else(|| ToolsError::Message("invalid file name".into()))?;
        if !name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
        {
            return Err(ToolsError::Message(
                "media file name must be simple ASCII".into(),
            ));
        }
        let remote = format!("/sdcard/Download/{name}");
        let adb = resolve_adb()?;
        run_ok(
            &adb,
            &["-s", device.id.as_str(), "push", path, remote.as_str()],
        )?;
        let uri = format!("file://{remote}");
        // Best-effort media scan; ignore soft failures after push succeeded.
        let _ = adb_shell(
            &device.id,
            &[
                "am",
                "broadcast",
                "-a",
                "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
                "-d",
                uri.as_str(),
            ],
        );
        return Ok(format!("pushed and scanned {remote}"));
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn open_url(device_id: &str, url: &str) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    validate_url(url)?;
    let url = url.trim();
    if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        run_ok(
            &xcrun,
            &["simctl", "openurl", device.id.as_str(), url],
        )?;
        return Ok(format!("opened {url}"));
    }
    if device.platform == "android" {
        adb_shell(
            &device.id,
            &["am", "start", "-a", "android.intent.action.VIEW", "-d", url],
        )?;
        return Ok(format!("opened {url}"));
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn clear_app_data(device_id: &str, package_id: &str) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    validate_package_id(package_id)?;
    let package_id = package_id.trim();
    if device.platform == "android" {
        adb_shell(&device.id, &["pm", "clear", package_id])?;
        return Ok(format!("cleared data for {package_id}"));
    }
    if device.platform == "ios-sim" {
        return Err(ToolsError::Message(
            "iOS Simulator has no pm clear — uninstall/reinstall instead".into(),
        ));
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn force_stop(device_id: &str, package_id: &str) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    validate_package_id(package_id)?;
    let package_id = package_id.trim();
    if device.platform == "android" {
        adb_shell(&device.id, &["am", "force-stop", package_id])?;
        return Ok(format!("force-stopped {package_id}"));
    }
    if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        run_ok(
            &xcrun,
            &["simctl", "terminate", device.id.as_str(), package_id],
        )?;
        return Ok(format!("terminated {package_id}"));
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn launch_app(device_id: &str, package_id: &str) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    validate_package_id(package_id)?;
    let package_id = package_id.trim();
    if device.platform == "android" {
        // Prefer monkey launcher for main activity without needing activity name.
        adb_shell(
            &device.id,
            &[
                "monkey",
                "-p",
                package_id,
                "-c",
                "android.intent.category.LAUNCHER",
                "1",
            ],
        )?;
        return Ok(format!("launched {package_id}"));
    }
    if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        run_ok(
            &xcrun,
            &["simctl", "launch", device.id.as_str(), package_id],
        )?;
        return Ok(format!("launched {package_id}"));
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn restart_app(device_id: &str, package_id: &str) -> Result<String, ToolsError> {
    let _ = force_stop(device_id, package_id);
    std::thread::sleep(Duration::from_millis(400));
    launch_app(device_id, package_id)?;
    Ok(format!("restarted {package_id}"))
}

pub fn permission_set(
    device_id: &str,
    package_id: &str,
    permission: &str,
    grant: bool,
) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    validate_package_id(package_id)?;
    validate_permission(permission, &device.platform)?;
    let package_id = package_id.trim();
    let permission = permission.trim();
    if device.platform == "android" {
        let action = if grant { "grant" } else { "revoke" };
        adb_shell(&device.id, &["pm", action, package_id, permission])?;
        return Ok(format!("{action} {permission} for {package_id}"));
    }
    if device.platform == "ios-sim" {
        let action = if grant { "grant" } else { "revoke" };
        let xcrun = resolve_xcrun()?;
        run_ok(
            &xcrun,
            &[
                "simctl",
                "privacy",
                device.id.as_str(),
                action,
                permission,
                package_id,
            ],
        )?;
        return Ok(format!("{action} {permission} for {package_id}"));
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn set_location(device_id: &str, lat: f64, lon: f64) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    validate_coords(lat, lon)?;
    if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        let coord = format!("{lat},{lon}");
        run_ok(
            &xcrun,
            &["simctl", "location", device.id.as_str(), "set", coord.as_str()],
        )?;
        return Ok(format!("location set to {lat},{lon}"));
    }
    if device.platform == "android" {
        // Emulator console geo fix expects longitude latitude.
        let lon_s = lon.to_string();
        let lat_s = lat.to_string();
        let adb = resolve_adb()?;
        let output = Command::new(&adb)
            .args(["-s", device.id.as_str(), "emu", "geo", "fix", &lon_s, &lat_s])
            .output()
            .map_err(|e| ToolsError::Message(format!("adb emu geo failed: {e}")))?;
        if !output.status.success() {
            return Err(ToolsError::Message(format!(
                "location set failed (emulator only): {}",
                output_message(&output, "adb emu geo fix failed")
            )));
        }
        return Ok(format!("location set to {lat},{lon}"));
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn set_appearance(device_id: &str, mode: &str) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    validate_appearance(mode)?;
    let mode = mode.trim();
    if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        run_ok(
            &xcrun,
            &["simctl", "ui", device.id.as_str(), "appearance", mode],
        )?;
        return Ok(format!("appearance set to {mode}"));
    }
    if device.platform == "android" {
        let night = if mode == "dark" { "yes" } else { "no" };
        adb_shell(&device.id, &["cmd", "uimode", "night", night])?;
        return Ok(format!("appearance set to {mode}"));
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn input_text(device_id: &str, text: &str) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    validate_input_text(text)?;
    let text = text.trim();
    if device.platform == "android" {
        let encoded = text.replace(' ', "%s");
        adb_shell(&device.id, &["input", "text", encoded.as_str()])?;
        return Ok("typed text".into());
    }
    Err(ToolsError::Message(
        "type text is Android-only (iOS Simulator has no reliable key injection)".into(),
    ))
}

pub fn list_packages(device_id: &str) -> Result<Vec<String>, ToolsError> {
    let device = find_device(device_id)?;
    if device.platform == "android" {
        let out = adb_shell(&device.id, &["pm", "list", "packages", "-3"])?;
        let mut pkgs: Vec<String> = out
            .lines()
            .filter_map(|line| line.trim().strip_prefix("package:"))
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        pkgs.sort();
        return Ok(pkgs);
    }
    if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        let out = run_ok(
            &xcrun,
            &["simctl", "listapps", device.id.as_str()],
        )?;
        // Prefer JSON when available
        if let Ok(value) = serde_json::from_str::<Value>(&out) {
            let mut pkgs = Vec::new();
            if let Some(map) = value.as_object() {
                for (bundle, meta) in map {
                    let is_app = meta
                        .get("ApplicationType")
                        .and_then(|v| v.as_str())
                        .map(|t| t == "User" || t == "System")
                        .unwrap_or(true);
                    if is_app {
                        pkgs.push(bundle.clone());
                    }
                }
            }
            pkgs.sort();
            return Ok(pkgs);
        }
        // Fallback: scrape CFBundleIdentifier lines
        let mut pkgs: Vec<String> = out
            .lines()
            .filter_map(|line| {
                let line = line.trim();
                line.strip_prefix("CFBundleIdentifier = ")
                    .or_else(|| line.strip_prefix("\"CFBundleIdentifier\" = "))
                    .map(|s| s.trim().trim_matches(';').trim_matches('"').to_string())
            })
            .filter(|s| !s.is_empty())
            .collect();
        pkgs.sort();
        pkgs.dedup();
        return Ok(pkgs);
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn adb_reverse(serial: Option<&str>, port: u16) -> Result<String, ToolsError> {
    validate_port(port)?;
    let adb = resolve_adb()?;
    let port_arg = format!("tcp:{port}");
    let mut cmd = Command::new(&adb);
    if let Some(s) = serial.filter(|s| !s.trim().is_empty()) {
        validate_device_id(s)?;
        cmd.arg("-s").arg(s.trim());
    }
    let output = cmd
        .arg("reverse")
        .arg(&port_arg)
        .arg(&port_arg)
        .output()
        .map_err(|e| ToolsError::Message(format!("adb reverse failed: {e}")))?;
    if !output.status.success() {
        return Err(ToolsError::Message(output_message(
            &output,
            "adb reverse failed",
        )));
    }
    Ok(format!("reversed {port_arg} -> {port_arg}"))
}

pub fn adb_reverse_remove(serial: Option<&str>, port: u16) -> Result<String, ToolsError> {
    validate_port(port)?;
    let adb = resolve_adb()?;
    let port_arg = format!("tcp:{port}");
    let mut cmd = Command::new(&adb);
    if let Some(s) = serial.filter(|s| !s.trim().is_empty()) {
        validate_device_id(s)?;
        cmd.arg("-s").arg(s.trim());
    }
    let output = cmd
        .arg("reverse")
        .arg("--remove")
        .arg(&port_arg)
        .output()
        .map_err(|e| ToolsError::Message(format!("adb reverse --remove failed: {e}")))?;
    if !output.status.success() {
        return Err(ToolsError::Message(output_message(
            &output,
            "adb reverse --remove failed",
        )));
    }
    Ok(format!("removed reverse {port_arg}"))
}

pub fn boot_device(device_id: &str) -> Result<String, ToolsError> {
    validate_device_id(device_id)?;
    // Prefer matching from current list (may be Shutdown).
    let devices = list_devices()?;
    if let Some(device) = devices.iter().find(|d| d.id == device_id) {
        if device.platform == "ios-sim" {
            let xcrun = resolve_xcrun()?;
            run_ok(&xcrun, &["simctl", "boot", device.id.as_str()])?;
            return Ok(format!("booted {}", device.id));
        }
        return Err(ToolsError::Message(
            "Android devices already online use Refresh; boot an AVD from the AVD list".into(),
        ));
    }
    // Treat as AVD name for Android emulator
    let emulator = resolve_emulator()?;
    let name = device_id.trim();
    if !name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.'))
    {
        return Err(ToolsError::Message("invalid AVD name".into()));
    }
    Command::new(&emulator)
        .args(["-avd", name])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| ToolsError::Message(format!("failed to start emulator: {e}")))?;
    Ok(format!("starting AVD {name}"))
}

pub fn shutdown_device(device_id: &str) -> Result<String, ToolsError> {
    let device = find_device(device_id)?;
    if device.platform == "ios-sim" {
        let xcrun = resolve_xcrun()?;
        run_ok(&xcrun, &["simctl", "shutdown", device.id.as_str()])?;
        return Ok(format!("shutdown {}", device.id));
    }
    if device.platform == "android" {
        let adb = resolve_adb()?;
        run_ok(&adb, &["-s", device.id.as_str(), "reboot", "-p"])?;
        return Ok(format!("powering off {}", device.id));
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn resolve_emulator() -> Result<PathBuf, ToolsError> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    for env_key in ["ANDROID_HOME", "ANDROID_SDK_ROOT"] {
        if let Ok(root) = std::env::var(env_key) {
            if !root.trim().is_empty() {
                candidates.push(PathBuf::from(root.trim()).join("emulator/emulator"));
            }
        }
    }
    candidates.push(expand_home("~/Library/Android/sdk/emulator/emulator"));
    candidates.push(PathBuf::from("/opt/homebrew/bin/emulator"));
    for path in &candidates {
        if is_executable(path) {
            return Ok(path.clone());
        }
    }
    if let Ok(output) = Command::new("which").arg("emulator").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let p = PathBuf::from(&path);
            if is_executable(&p) {
                return Ok(p);
            }
        }
    }
    Err(ToolsError::Message(
        "emulator not found. Install Android SDK emulator tools.".into(),
    ))
}

pub fn list_avds() -> Result<Vec<String>, ToolsError> {
    let emulator = resolve_emulator()?;
    let out = run_ok(&emulator, &["-list-avds"])?;
    let mut names: Vec<String> = out
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();
    names.sort();
    Ok(names)
}

#[derive(Debug, Clone)]
pub struct RecordMeta {
    pub device_id: String,
    pub platform: String,
    pub device_path: Option<String>,
    pub host_path: String,
}

pub fn start_record(device_id: &str) -> Result<(std::process::Child, RecordMeta), ToolsError> {
    let device = find_device(device_id)?;
    if device.platform == "ios-sim" {
        let host_path = std::env::temp_dir().join(format!(
            "zippy-record-{}.mp4",
            uuid::Uuid::new_v4()
        ));
        let host_str = host_path.to_string_lossy().to_string();
        let xcrun = resolve_xcrun()?;
        let child = Command::new(&xcrun)
            .args([
                "simctl",
                "io",
                device.id.as_str(),
                "recordVideo",
                "--codec=h264",
                host_str.as_str(),
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| ToolsError::Message(format!("recordVideo failed: {e}")))?;
        return Ok((
            child,
            RecordMeta {
                device_id: device.id,
                platform: device.platform,
                device_path: None,
                host_path: host_str,
            },
        ));
    }
    if device.platform == "android" {
        let remote = format!("/sdcard/Download/zippy-record-{}.mp4", uuid::Uuid::new_v4());
        let adb = resolve_adb()?;
        let child = Command::new(&adb)
            .args([
                "-s",
                device.id.as_str(),
                "shell",
                "screenrecord",
                "--time-limit",
                "180",
                remote.as_str(),
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| ToolsError::Message(format!("screenrecord failed: {e}")))?;
        let host_path = std::env::temp_dir()
            .join(format!("zippy-record-{}.mp4", uuid::Uuid::new_v4()))
            .to_string_lossy()
            .to_string();
        return Ok((
            child,
            RecordMeta {
                device_id: device.id,
                platform: device.platform,
                device_path: Some(remote),
                host_path,
            },
        ));
    }
    Err(ToolsError::Message(format!(
        "unsupported platform: {}",
        device.platform
    )))
}

pub fn finalize_record(meta: &RecordMeta) -> Result<String, ToolsError> {
    if meta.platform == "android" {
        let adb = resolve_adb()?;
        // Ask device to finalize screenrecord.
        let _ = adb_shell(&meta.device_id, &["pkill", "-SIGINT", "screenrecord"]);
        std::thread::sleep(Duration::from_millis(800));
        let remote = meta
            .device_path
            .as_deref()
            .ok_or_else(|| ToolsError::Message("missing remote record path".into()))?;
        run_ok(
            &adb,
            &[
                "-s",
                meta.device_id.as_str(),
                "pull",
                remote,
                meta.host_path.as_str(),
            ],
        )?;
        let _ = adb_shell(&meta.device_id, &["rm", "-f", remote]);
    }
    if !PathBuf::from(&meta.host_path).exists() {
        return Err(ToolsError::Message(
            "recording file not found — try again".into(),
        ));
    }
    Ok(meta.host_path.clone())
}
