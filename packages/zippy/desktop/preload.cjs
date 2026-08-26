const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zippy', {
  version: '0.0.1',
  platform: process.platform,
  probe: {
    getSettings: () => ipcRenderer.invoke('probe:get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('probe:save-settings', settings),
    connect: (settings) => ipcRenderer.invoke('probe:connect', settings),
    disconnect: () => ipcRenderer.invoke('probe:disconnect'),
    status: () => ipcRenderer.invoke('probe:status'),
    request: (method, params) => ipcRenderer.invoke('probe:request', method, params),
    onStatus: (callback) => subscribe('probe:status', callback),
    onEvent: (callback) => subscribe('probe:event', callback),
    onNetwork: (callback) => subscribe('probe:network', callback),
    onPerf: (callback) => subscribe('probe:perf', callback),
    onDevice: (callback) => subscribe('probe:device', callback),
    onError: (callback) => subscribe('probe:error', callback),
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    install: () => ipcRenderer.invoke('updater:install'),
    onAvailable: (callback) => subscribe('updater:available', callback),
    onNotAvailable: (callback) => subscribe('updater:not-available', callback),
    onProgress: (callback) => subscribe('updater:progress', callback),
    onDownloaded: (callback) => subscribe('updater:downloaded', callback),
    onError: (callback) => subscribe('updater:error', callback),
  },
  getVersion: () => ipcRenderer.invoke('app:get-version'),
});

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}
