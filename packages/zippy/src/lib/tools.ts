import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { ScreenshotResult, ToolsDevice } from '../types/tools';

type Unsubscribe = () => void;

function subscribe<T>(event: string, callback: (payload: T) => void): Unsubscribe {
  let unlisten: UnlistenFn | undefined;
  void listen<T>(event, (event) => callback(event.payload)).then((fn) => {
    unlisten = fn;
  });
  return () => {
    unlisten?.();
  };
}

export const toolsApi = {
  listDevices: () => invoke<ToolsDevice[]>('tools_list_devices'),
  listAvds: () => invoke<string[]>('tools_list_avds'),
  adbForward: (serial?: string | null, port = 9876) =>
    invoke<string>('tools_adb_forward', { serial: serial ?? null, port }),
  adbForwardRemove: (serial?: string | null, port = 9876) =>
    invoke<string>('tools_adb_forward_remove', { serial: serial ?? null, port }),
  adbReverse: (serial?: string | null, port = 8081) =>
    invoke<string>('tools_adb_reverse', { serial: serial ?? null, port }),
  adbReverseRemove: (serial?: string | null, port = 8081) =>
    invoke<string>('tools_adb_reverse_remove', { serial: serial ?? null, port }),
  screenshot: (deviceId: string) =>
    invoke<ScreenshotResult>('tools_screenshot', { deviceId }),
  saveFile: (path: string, base64: string) =>
    invoke<string>('tools_save_file', { path, base64 }),
  install: (deviceId: string, path: string) =>
    invoke<string>('tools_install', { deviceId, path }),
  uninstall: (deviceId: string, packageId: string) =>
    invoke<string>('tools_uninstall', { deviceId, packageId }),
  addMedia: (deviceId: string, path: string) =>
    invoke<string>('tools_add_media', { deviceId, path }),
  openUrl: (deviceId: string, url: string) =>
    invoke<string>('tools_open_url', { deviceId, url }),
  clearData: (deviceId: string, packageId: string) =>
    invoke<string>('tools_clear_data', { deviceId, packageId }),
  forceStop: (deviceId: string, packageId: string) =>
    invoke<string>('tools_force_stop', { deviceId, packageId }),
  launchApp: (deviceId: string, packageId: string) =>
    invoke<string>('tools_launch_app', { deviceId, packageId }),
  restartApp: (deviceId: string, packageId: string) =>
    invoke<string>('tools_restart_app', { deviceId, packageId }),
  permissionSet: (deviceId: string, packageId: string, permission: string, grant: boolean) =>
    invoke<string>('tools_permission_set', { deviceId, packageId, permission, grant }),
  setLocation: (deviceId: string, lat: number, lon: number) =>
    invoke<string>('tools_set_location', { deviceId, lat, lon }),
  setAppearance: (deviceId: string, mode: string) =>
    invoke<string>('tools_set_appearance', { deviceId, mode }),
  inputText: (deviceId: string, text: string) =>
    invoke<string>('tools_input_text', { deviceId, text }),
  listPackages: (deviceId: string) =>
    invoke<string[]>('tools_list_packages', { deviceId }),
  bootDevice: (deviceId: string) => invoke<string>('tools_boot_device', { deviceId }),
  shutdownDevice: (deviceId: string) =>
    invoke<string>('tools_shutdown_device', { deviceId }),
  logStart: (deviceId: string, filter?: string | null) =>
    invoke<void>('tools_log_start', { deviceId, filter: filter ?? null }),
  logStop: () => invoke<void>('tools_log_stop'),
  recordStart: (deviceId: string) => invoke<void>('tools_record_start', { deviceId }),
  recordStop: () => invoke<string>('tools_record_stop'),
  onLogBatch: (callback: (payload: { lines: string[] }) => void) =>
    subscribe('tools:log-batch', callback),
  onLogStatus: (callback: (payload: { running: boolean; message?: string | null }) => void) =>
    subscribe('tools:log-status', callback),
  onRecordStatus: (
    callback: (payload: {
      running: boolean;
      path?: string | null;
      message?: string | null;
    }) => void,
  ) => subscribe('tools:record-status', callback),
};
