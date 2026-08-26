const path = require('node:path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const Store = require('electron-store');
const { setupAutoUpdater, installUpdate } = require('./updater.cjs');

const appRoot = path.join(__dirname, '..');
const store = new Store({ name: 'zippy-settings' });

/** @type {import('./probe-client.mjs').ProbeClient | null} */
let probeClient = null;

/** @type {BrowserWindow | null} */
let mainWindow = null;

async function getProbeClient() {
  if (!probeClient) {
    const { ProbeClient } = await import('./probe-client.mjs');
    probeClient = new ProbeClient();
    wireProbeEvents();
  }
  return probeClient;
}

function getMainWindow() {
  return mainWindow;
}

function broadcast(channel, payload) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}

function wireProbeEvents() {
  if (!probeClient) {
    return;
  }
  probeClient.on('status', (payload) => broadcast('probe:status', payload));
  probeClient.on('event', (payload) => broadcast('probe:event', payload));
  probeClient.on('network', (payload) => broadcast('probe:network', payload));
  probeClient.on('perf', (payload) => broadcast('probe:perf', payload));
  probeClient.on('device', (payload) => broadcast('probe:device', payload));
  probeClient.on('error', (error) => broadcast('probe:error', { message: error.message }));
}

function registerIpc() {
  ipcMain.handle('probe:get-settings', () => ({
    host: store.get('probeHost', '127.0.0.1'),
    port: store.get('probePort', 9876),
  }));

  ipcMain.handle('probe:save-settings', (_event, settings) => {
    if (settings?.host) {
      store.set('probeHost', settings.host);
    }
    if (settings?.port) {
      store.set('probePort', Number(settings.port));
    }
    return {
      host: store.get('probeHost'),
      port: store.get('probePort'),
    };
  });

  ipcMain.handle('probe:connect', async (_event, settings) => {
    const client = await getProbeClient();
    const host = settings?.host ?? store.get('probeHost', '127.0.0.1');
    const port = Number(settings?.port ?? store.get('probePort', 9876));
    store.set('probeHost', host);
    store.set('probePort', port);
    return client.connect(host, port);
  });

  ipcMain.handle('probe:disconnect', async () => {
    const client = await getProbeClient();
    client.disconnect();
    return { connected: false };
  });

  ipcMain.handle('probe:status', async () => {
    const client = await getProbeClient();
    return {
      connected: client.connected,
      url: client.url,
    };
  });

  ipcMain.handle('probe:request', async (_event, method, params = {}) => {
    const client = await getProbeClient();
    if (!client.connected) {
      throw new Error('Probe is not connected. Open Device panel and connect first.');
    }
    return client.request(method, params);
  });

  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('updater:check', () => setupAutoUpdater(app, getMainWindow, appRoot, { manual: true }));
  ipcMain.handle('updater:install', () => installUpdate());
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'Zippy',
    show: false,
    backgroundColor: '#0f1419',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

registerIpc();

app.whenReady().then(() => {
  createMainWindow();
  setupAutoUpdater(app, getMainWindow, appRoot);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (probeClient) {
    probeClient.disconnect();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
