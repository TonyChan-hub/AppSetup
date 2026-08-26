const path = require('node:path');

/** @type {import('electron-updater').AppUpdater | null} */
let autoUpdater = null;

function getAutoUpdater() {
  if (!autoUpdater) {
    autoUpdater = require('electron-updater').autoUpdater;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
  }
  return autoUpdater;
}

/**
 * @param {import('electron').App} electronApp
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 * @param {string} appRoot
 * @param {{ manual?: boolean }} [options]
 */
function setupAutoUpdater(electronApp, getMainWindow, appRoot, options = {}) {
  const updater = getAutoUpdater();

  if (!electronApp.isPackaged) {
    updater.forceDevUpdateConfig = true;
    updater.updateConfigPath = path.join(appRoot, 'dev-app-update.yml');
  }

  updater.removeAllListeners();

  updater.on('update-available', (info) => {
    getMainWindow()?.webContents.send('updater:available', info);
  });

  updater.on('update-not-available', (info) => {
    if (options.manual) {
      getMainWindow()?.webContents.send('updater:not-available', info);
    }
  });

  updater.on('download-progress', (progress) => {
    getMainWindow()?.webContents.send('updater:progress', progress);
  });

  updater.on('update-downloaded', (info) => {
    getMainWindow()?.webContents.send('updater:downloaded', info);
  });

  updater.on('error', (error) => {
    getMainWindow()?.webContents.send('updater:error', { message: error.message });
  });

  if (electronApp.isPackaged || options.manual) {
    return updater.checkForUpdates().catch((error) => {
      getMainWindow()?.webContents.send('updater:error', { message: error.message });
      return null;
    });
  }

  return Promise.resolve(null);
}

function installUpdate() {
  getAutoUpdater().quitAndInstall();
  return { ok: true };
}

module.exports = {
  setupAutoUpdater,
  installUpdate,
};
