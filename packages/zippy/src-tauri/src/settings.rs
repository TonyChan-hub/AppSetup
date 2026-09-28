use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri_plugin_store::StoreExt;

use crate::protocol::DEFAULT_PROBE_PORT;

const STORE_PATH: &str = "zippy-settings.json";
const KEY_HOST: &str = "probeHost";
const KEY_PORT: &str = "probePort";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeSettings {
    pub host: String,
    pub port: u16,
}

impl Default for ProbeSettings {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".into(),
            port: DEFAULT_PROBE_PORT,
        }
    }
}

pub fn load_settings(app: &tauri::AppHandle) -> Result<ProbeSettings, String> {
    let store = app.store(STORE_PATH).map_err(|error| error.to_string())?;
    let host = store
        .get(KEY_HOST)
        .and_then(|value| value.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| ProbeSettings::default().host);
    let port = store
        .get(KEY_PORT)
        .and_then(|value| value.as_u64())
        .map(|value| value as u16)
        .unwrap_or(DEFAULT_PROBE_PORT);
    Ok(ProbeSettings { host, port })
}

pub fn save_settings(app: &tauri::AppHandle, settings: &ProbeSettings) -> Result<ProbeSettings, String> {
    let store = app.store(STORE_PATH).map_err(|error| error.to_string())?;
    store.set(KEY_HOST, Value::String(settings.host.clone()));
    store.set(KEY_PORT, Value::from(settings.port));
    store.save().map_err(|error| error.to_string())?;
    Ok(settings.clone())
}

#[derive(Debug, Deserialize)]
pub struct PartialSettings {
    pub host: Option<String>,
    pub port: Option<u16>,
}

pub fn merge_settings(
    app: &tauri::AppHandle,
    partial: PartialSettings,
) -> Result<ProbeSettings, String> {
    let mut current = load_settings(app)?;
    if let Some(host) = partial.host.filter(|value| !value.trim().is_empty()) {
        current.host = host;
    }
    if let Some(port) = partial.port.filter(|value| *value > 0) {
        current.port = port;
    }
    save_settings(app, &current)
}
