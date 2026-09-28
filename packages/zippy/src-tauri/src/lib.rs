mod commands;
mod probe;
mod protocol;
mod settings;

use commands::AppState;
use probe::ProbeClient;
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            probe: ProbeClient::new(),
        })
        .invoke_handler(tauri::generate_handler![
            commands::probe_get_settings,
            commands::probe_save_settings,
            commands::probe_connect,
            commands::probe_disconnect,
            commands::probe_status,
            commands::probe_request,
            commands::app_get_version,
            commands::app_get_platform,
            commands::updater_check,
            commands::updater_install,
        ])
        .setup(|app| {
            if cfg!(dev) {
                return Ok(());
            }
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = commands::run_updater_check(handle.clone(), false).await {
                    let _ = handle.emit(
                        "updater:error",
                        serde_json::json!({ "message": error }),
                    );
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Zippy");
}
