use crate::probe::{ProbeClient, ProbeStatus};
use crate::settings::{self, PartialSettings, ProbeSettings};
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_updater::UpdaterExt;

pub struct AppState {
    pub probe: ProbeClient,
}

#[tauri::command]
pub async fn probe_get_settings(app: AppHandle) -> Result<ProbeSettings, String> {
    settings::load_settings(&app)
}

#[tauri::command]
pub async fn probe_save_settings(
    app: AppHandle,
    settings: PartialSettings,
) -> Result<ProbeSettings, String> {
    settings::merge_settings(&app, settings)
}

#[tauri::command]
pub async fn probe_connect(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: Option<PartialSettings>,
) -> Result<ProbeStatus, String> {
    let mut current = settings::load_settings(&app)?;
    if let Some(partial) = settings {
        if let Some(host) = partial.host.filter(|value| !value.trim().is_empty()) {
            current.host = host;
        }
        if let Some(port) = partial.port.filter(|value| *value > 0) {
            current.port = port;
        }
    }
    settings::save_settings(&app, &current)?;
    state.probe.connect(app, current.host, current.port).await
}

#[tauri::command]
pub async fn probe_disconnect(app: AppHandle, state: State<'_, AppState>) -> Result<ProbeStatus, String> {
    state.probe.disconnect(&app).await;
    Ok(ProbeStatus {
        connected: false,
        url: String::new(),
    })
}

#[tauri::command]
pub async fn probe_status(state: State<'_, AppState>) -> Result<ProbeStatus, String> {
    Ok(state.probe.status().await)
}

#[tauri::command]
pub async fn probe_request(
    state: State<'_, AppState>,
    method: String,
    params: Option<Value>,
) -> Result<Value, String> {
    let status = state.probe.status().await;
    if !status.connected {
        return Err("Probe is not connected. Open Device panel and connect first.".into());
    }
    state
        .probe
        .request(&method, params.unwrap_or_else(|| Value::Object(Default::default())))
        .await
}

#[tauri::command]
pub fn app_get_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub fn app_get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[derive(Clone, Serialize)]
struct UpdateInfo {
    version: String,
}

#[derive(Clone, Serialize)]
struct UpdateProgress {
    percent: f64,
}

pub async fn run_updater_check(app: AppHandle, manual: bool) -> Result<(), String> {
    let updater = app
        .updater_builder()
        .build()
        .map_err(|error| error.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => {
            let _ = app.emit(
                "updater:available",
                UpdateInfo {
                    version: update.version.clone(),
                },
            );

            let mut downloaded: u64 = 0;
            let app_progress = app.clone();
            update
                .download_and_install(
                    |chunk_length, content_length| {
                        downloaded += chunk_length as u64;
                        if let Some(total) = content_length {
                            let percent = if total == 0 {
                                0.0
                            } else {
                                (downloaded as f64 / total as f64) * 100.0
                            };
                            let _ = app_progress.emit(
                                "updater:progress",
                                UpdateProgress { percent },
                            );
                        }
                    },
                    || {},
                )
                .await
                .map_err(|error| error.to_string())?;

            let _ = app.emit(
                "updater:downloaded",
                UpdateInfo {
                    version: update.version,
                },
            );
            Ok(())
        }
        Ok(None) => {
            if manual {
                let _ = app.emit(
                    "updater:not-available",
                    UpdateInfo {
                        version: app.package_info().version.to_string(),
                    },
                );
            }
            Ok(())
        }
        Err(error) => {
            let message = error.to_string();
            if manual || !cfg!(dev) {
                let _ = app.emit("updater:error", serde_json::json!({ "message": message.clone() }));
            }
            // In dev, updater endpoints often fail — don't surface unless manual.
            if cfg!(dev) && !manual {
                Ok(())
            } else {
                Err(message)
            }
        }
    }
}

#[tauri::command]
pub async fn updater_check(app: AppHandle) -> Result<(), String> {
    run_updater_check(app, true).await
}

#[tauri::command]
pub async fn updater_install(app: AppHandle) -> Result<(), String> {
    app.restart();
    #[allow(unreachable_code)]
    Ok(())
}
