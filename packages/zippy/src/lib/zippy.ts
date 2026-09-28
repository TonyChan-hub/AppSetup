import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export type ProbeSettings = {
  host: string;
  port: number;
};

export type ProbeStatus = {
  connected: boolean;
  url: string;
};

export type UpdateInfo = {
  version: string;
};

export type UpdateProgress = {
  percent: number;
};

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

export const zippy = {
  platform: 'unknown',
  async initPlatform(): Promise<void> {
    try {
      this.platform = await invoke<string>('app_get_platform');
    } catch {
      this.platform = navigator.platform || 'unknown';
    }
  },
  probe: {
    getSettings: () => invoke<ProbeSettings>('probe_get_settings'),
    saveSettings: (settings: Partial<ProbeSettings>) =>
      invoke<ProbeSettings>('probe_save_settings', { settings }),
    connect: (settings?: Partial<ProbeSettings>) =>
      invoke<ProbeStatus>('probe_connect', { settings: settings ?? null }),
    disconnect: () => invoke<ProbeStatus>('probe_disconnect'),
    status: () => invoke<ProbeStatus>('probe_status'),
    request: <T = unknown>(method: string, params: Record<string, unknown> = {}) =>
      invoke<T>('probe_request', { method, params }),
    onStatus: (callback: (payload: ProbeStatus) => void) => subscribe('probe:status', callback),
    onEvent: (callback: (payload: unknown) => void) => subscribe('probe:event', callback),
    onNetwork: (callback: (payload: Record<string, unknown>) => void) =>
      subscribe('probe:network', callback),
    onPerf: (callback: (payload: Record<string, unknown>) => void) =>
      subscribe('probe:perf', callback),
    onDevice: (callback: (payload: Record<string, unknown>) => void) =>
      subscribe('probe:device', callback),
    onError: (callback: (payload: { message: string }) => void) =>
      subscribe('probe:error', callback),
  },
  updater: {
    check: () => invoke<void>('updater_check'),
    install: () => invoke<void>('updater_install'),
    onAvailable: (callback: (info: UpdateInfo) => void) =>
      subscribe('updater:available', callback),
    onNotAvailable: (callback: (info: UpdateInfo) => void) =>
      subscribe('updater:not-available', callback),
    onProgress: (callback: (progress: UpdateProgress) => void) =>
      subscribe('updater:progress', callback),
    onDownloaded: (callback: (info: UpdateInfo) => void) =>
      subscribe('updater:downloaded', callback),
    onError: (callback: (payload: { message: string }) => void) =>
      subscribe('updater:error', callback),
  },
  getVersion: () => invoke<string>('app_get_version'),
};
