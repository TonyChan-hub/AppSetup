mod commands;
mod git;
mod git_commands;
mod git_config;
mod probe;
mod protocol;
mod settings;
mod tools;
mod tools_commands;

use commands::AppState;
use probe::ProbeClient;
use tauri::Emitter;
use tools_commands::{LogStreamState, RecordStreamState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            probe: ProbeClient::new(),
        })
        .manage(LogStreamState::new())
        .manage(RecordStreamState::new())
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
            git_commands::get_config,
            git_commands::add_repo,
            git_commands::remove_repo,
            git_commands::select_repo,
            git_commands::upsert_profile,
            git_commands::delete_profile,
            git_commands::bind_repo_profile,
            git_commands::list_branches,
            git_commands::checkout_branch,
            git_commands::create_branch,
            git_commands::delete_branch,
            git_commands::get_repo_status,
            git_commands::apply_profile,
            git_commands::fetch_repo,
            git_commands::push_repo,
            git_commands::recent_log,
            git_commands::list_ssh_keys,
            git_commands::import_missing_ssh_profiles,
            tools_commands::tools_list_devices,
            tools_commands::tools_list_avds,
            tools_commands::tools_adb_forward,
            tools_commands::tools_adb_forward_remove,
            tools_commands::tools_adb_reverse,
            tools_commands::tools_adb_reverse_remove,
            tools_commands::tools_screenshot,
            tools_commands::tools_save_file,
            tools_commands::tools_install,
            tools_commands::tools_uninstall,
            tools_commands::tools_add_media,
            tools_commands::tools_open_url,
            tools_commands::tools_clear_data,
            tools_commands::tools_force_stop,
            tools_commands::tools_launch_app,
            tools_commands::tools_restart_app,
            tools_commands::tools_permission_set,
            tools_commands::tools_set_location,
            tools_commands::tools_set_appearance,
            tools_commands::tools_input_text,
            tools_commands::tools_list_packages,
            tools_commands::tools_boot_device,
            tools_commands::tools_shutdown_device,
            tools_commands::tools_log_start,
            tools_commands::tools_log_stop,
            tools_commands::tools_record_start,
            tools_commands::tools_record_stop,
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
