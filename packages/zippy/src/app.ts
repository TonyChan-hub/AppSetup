import {
  renderDbPanel,
  renderDevicePanel,
  renderKvPanel,
  renderNetworkPanel,
  renderPerfPanel,
  type AppActions,
  type AppState,
  type DeviceInfo,
} from './panels/index';
import { mountGitPanel, type GitController } from './panels/git';
import { mountToolsPanel, type ToolsController } from './panels/tools';
import { zippy } from './lib/zippy';

type AppMode = 'git' | 'inspector' | 'tools';

const panels: Record<string, { title: string; desc: string }> = {
  device: {
    title: 'Device',
    desc: 'Connected runtime, app id, and platform info.',
  },
  kv: {
    title: 'MMKV / KV',
    desc: 'Browse key-value stores from the debug probe.',
  },
  db: {
    title: 'SQLite',
    desc: 'Inspect tables and run read-only queries.',
  },
  network: {
    title: 'Network',
    desc: 'Captured requests, timings, and payloads.',
  },
  perf: {
    title: 'Perf',
    desc: 'FPS, memory, and CPU trends while debugging.',
  },
};

const appRoot = document.getElementById('app-root');
const titleEl = document.getElementById('panel-title');
const descEl = document.getElementById('panel-desc');
const statusEl = document.getElementById('connection-status');
const statusDotEl = document.getElementById('status-dot');
const statusWrapEl = document.getElementById('connection-status-wrap');
const panelEl = document.getElementById('panel');
const metaEl = document.getElementById('runtime-meta');
const modeInspectorEl = document.getElementById('mode-inspector');
const modeGitEl = document.getElementById('mode-git');
const modeToolsEl = document.getElementById('mode-tools');
const gitShellEl = document.getElementById('git-shell');
const toolsShellEl = document.getElementById('tools-shell');
const navItems = document.querySelectorAll<HTMLButtonElement>('.nav-item');
const modeTabs = document.querySelectorAll<HTMLButtonElement>('.mode-tab');

const state: AppState = {
  activePanel: 'device',
  connected: false,
  host: '127.0.0.1',
  port: 9876,
  deviceInfo: null,
  updateStatus: 'Updates check on startup when packaged.',
  installUpdateReady: false,
  instances: [],
  selectedInstanceId: null,
  keys: [],
  selectedKey: null,
  search: '',
  entry: null,
  databases: [],
  selectedDatabaseId: null,
  tables: [],
  selectedTable: null,
  schema: [],
  rows: null,
  networkEvents: [],
  selectedEventId: null,
  perf: null,
};

let activeMode: AppMode = 'inspector';
let gitController: GitController | null = null;
let gitBootstrapped = false;
let toolsController: ToolsController | null = null;
let toolsBootstrapped = false;

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unexpected error';
}

const actions: AppActions = {
  async connect(settings) {
    setStatus('Connecting…', false);
    try {
      await zippy.probe.saveSettings(settings);
      await zippy.probe.connect(settings);
      state.host = settings.host;
      state.port = settings.port;
      state.connected = true;
      setStatus(`Connected to ${settings.host}:${settings.port}`, true);
      state.deviceInfo = await zippy.probe.request<DeviceInfo>('device.info');
      await refreshPanelData();
    } catch (error) {
      state.connected = false;
      setStatus(errorMessage(error) || 'Connection failed', false);
    }
    render();
  },
  async disconnect() {
    await zippy.probe.disconnect();
    state.connected = false;
    setStatus('Disconnected', false);
    render();
  },
  async refreshDevice() {
    if (!state.connected) {
      setStatus('Connect to a probe first', false);
      return;
    }
    try {
      state.deviceInfo = await zippy.probe.request<DeviceInfo>('device.info');
      render();
    } catch (error) {
      setStatus(errorMessage(error), false);
    }
  },
  async checkUpdate() {
    state.updateStatus = 'Checking for updates…';
    render();
    try {
      await zippy.updater.check();
    } catch (error) {
      state.updateStatus = errorMessage(error);
      render();
    }
  },
  async installUpdate() {
    await zippy.updater.install();
  },
  async refreshInstances() {
    if (!state.connected) return;
    try {
      const result = await zippy.probe.request<{ instances?: AppState['instances'] }>(
        'mmkv.listInstances',
      );
      state.instances = result.instances ?? [];
      if (!state.selectedInstanceId && state.instances[0]) {
        state.selectedInstanceId = state.instances[0].id;
        await actions.selectInstance(state.selectedInstanceId);
      }
      render();
    } catch (error) {
      setStatus(errorMessage(error), false);
    }
  },
  async selectInstance(instanceId) {
    if (!state.connected) return;
    try {
      state.selectedInstanceId = instanceId;
      const result = await zippy.probe.request<{ keys?: string[] }>('mmkv.listKeys', {
        instanceId,
      });
      state.keys = result.keys ?? [];
      state.selectedKey = null;
      state.entry = null;
      render();
    } catch (error) {
      setStatus(errorMessage(error), false);
    }
  },
  setSearch(value) {
    state.search = value;
    render();
  },
  async selectKey(key) {
    if (!state.connected) return;
    try {
      state.selectedKey = key;
      const result = await zippy.probe.request<{ entry: AppState['entry'] }>('mmkv.get', {
        instanceId: state.selectedInstanceId,
        key,
      });
      state.entry = result.entry;
      render();
    } catch (error) {
      setStatus(errorMessage(error), false);
    }
  },
  async refreshDatabases() {
    if (!state.connected) return;
    try {
      const result = await zippy.probe.request<{ databases?: AppState['databases'] }>(
        'sqlite.listDatabases',
      );
      state.databases = result.databases ?? [];
      render();
    } catch (error) {
      setStatus(errorMessage(error), false);
    }
  },
  async selectDatabase(databaseId) {
    if (!state.connected) return;
    try {
      state.selectedDatabaseId = databaseId;
      const result = await zippy.probe.request<{ tables?: AppState['tables'] }>(
        'sqlite.listTables',
        { databaseId },
      );
      state.tables = result.tables ?? [];
      state.selectedTable = null;
      state.schema = [];
      state.rows = null;
      render();
    } catch (error) {
      setStatus(errorMessage(error), false);
    }
  },
  async selectTable(table) {
    if (!state.connected) return;
    try {
      state.selectedTable = table;
      const schemaResult = await zippy.probe.request<{ columns?: AppState['schema'] }>(
        'sqlite.schema',
        {
          databaseId: state.selectedDatabaseId,
          table,
        },
      );
      state.schema = schemaResult.columns ?? [];
      await actions.reloadRows();
    } catch (error) {
      setStatus(errorMessage(error), false);
    }
  },
  async reloadRows() {
    if (!state.connected || !state.selectedDatabaseId || !state.selectedTable) {
      return;
    }
    try {
      state.rows = await zippy.probe.request('sqlite.query', {
        databaseId: state.selectedDatabaseId,
        table: state.selectedTable,
      });
      render();
    } catch (error) {
      setStatus(errorMessage(error), false);
    }
  },
  async refreshPerf() {
    if (!state.connected) return;
    try {
      state.perf = await zippy.probe.request('perf.latest');
      render();
    } catch (error) {
      setStatus(errorMessage(error), false);
    }
  },
};

function setMode(mode: AppMode): void {
  activeMode = mode;
  appRoot?.setAttribute('data-mode', mode);
  modeTabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  if (modeInspectorEl) modeInspectorEl.hidden = mode !== 'inspector';
  if (modeGitEl) modeGitEl.hidden = mode !== 'git';
  if (modeToolsEl) modeToolsEl.hidden = mode !== 'tools';
  if (statusWrapEl) statusWrapEl.hidden = mode !== 'inspector';

  if (mode === 'git') {
    if (gitShellEl && !gitController) {
      gitController = mountGitPanel(gitShellEl);
    }
    if (gitController && !gitBootstrapped) {
      gitBootstrapped = true;
      void gitController.bootstrap();
    } else {
      gitController?.render();
    }
  } else if (mode === 'tools') {
    if (toolsShellEl && !toolsController) {
      toolsController = mountToolsPanel(toolsShellEl);
    }
    if (toolsController && !toolsBootstrapped) {
      toolsBootstrapped = true;
      void toolsController.bootstrap();
    } else {
      toolsController?.render();
    }
  } else {
    render();
  }
}

function setPanel(id: string): void {
  state.activePanel = id;
  const panel = panels[id] ?? panels.device;
  if (titleEl) titleEl.textContent = panel.title;
  if (descEl) descEl.textContent = panel.desc;
  navItems.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.panel === id);
  });
  render();
}

function setStatus(text: string, connected: boolean): void {
  state.connected = connected;
  if (statusEl) statusEl.textContent = text;
  statusDotEl?.classList.toggle('is-online', connected);
}

async function refreshPanelData(): Promise<void> {
  if (!state.connected) {
    return;
  }
  try {
    if (state.activePanel === 'kv') {
      await actions.refreshInstances();
    }
    if (state.activePanel === 'db') {
      await actions.refreshDatabases();
    }
    if (state.activePanel === 'network') {
      const result = await zippy.probe.request<{ events?: AppState['networkEvents'] }>(
        'network.list',
      );
      state.networkEvents = result.events ?? [];
    }
    if (state.activePanel === 'perf') {
      await actions.refreshPerf();
    }
  } catch (error) {
    setStatus(errorMessage(error) || 'Failed to refresh panel', true);
  }
  render();
}

function render(): void {
  if (activeMode !== 'inspector' || !panelEl) {
    return;
  }

  if (state.activePanel === 'device') {
    renderDevicePanel(panelEl, state, actions);
    if (state.installUpdateReady) {
      panelEl.querySelector('#device-install-update')?.removeAttribute('hidden');
    }
    return;
  }

  if (!state.connected) {
    panelEl.innerHTML = `
      <div class="empty">
        <h2>Not connected</h2>
        <p>Connect to a debug probe from the Device panel first.</p>
      </div>`;
    return;
  }

  if (state.activePanel === 'kv') {
    renderKvPanel(panelEl, state, actions);
  } else if (state.activePanel === 'db') {
    renderDbPanel(panelEl, state, actions);
  } else if (state.activePanel === 'network') {
    renderNetworkPanel(panelEl, {
      ...state,
      onSelectEvent: (eventId) => {
        state.selectedEventId = state.selectedEventId === eventId ? null : eventId;
        render();
      },
    });
  } else if (state.activePanel === 'perf') {
    renderPerfPanel(panelEl, { ...state, onRefresh: () => void actions.refreshPerf() });
  }
}

navItems.forEach((item) => {
  item.addEventListener('click', async () => {
    setPanel(item.dataset.panel ?? 'device');
    await refreshPanelData();
  });
});

modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const mode = (tab.dataset.mode as AppMode) || 'inspector';
    setMode(mode);
  });
});

export async function bootstrap(): Promise<void> {
  await zippy.initPlatform();
  if (metaEl) {
    const version = await zippy.getVersion().catch(() => '0.0.1');
    metaEl.textContent = `v${version} · ${zippy.platform}`;
  }

  const settings = await zippy.probe.getSettings();
  state.host = settings.host;
  state.port = settings.port;

  zippy.probe.onStatus((payload) => {
    setStatus(
      payload.connected ? `Connected to ${payload.url}` : 'Waiting for device',
      payload.connected,
    );
    if (activeMode === 'inspector') {
      render();
    }
  });

  zippy.probe.onDevice((payload) => {
    state.deviceInfo = payload as DeviceInfo;
    if (activeMode === 'inspector') {
      render();
    }
  });

  zippy.probe.onNetwork((payload) => {
    state.networkEvents = [payload, ...state.networkEvents.filter((item) => item.id !== payload.id)].slice(
      0,
      500,
    );
    if (activeMode === 'inspector' && state.activePanel === 'network') {
      render();
    }
  });

  zippy.probe.onPerf((payload) => {
    state.perf = payload as AppState['perf'];
    if (activeMode === 'inspector' && state.activePanel === 'perf') {
      render();
    }
  });

  zippy.probe.onError((payload) => {
    setStatus(payload.message, false);
  });

  zippy.updater.onAvailable((info) => {
    state.updateStatus = `Update ${info.version} available. Downloading…`;
    if (activeMode === 'inspector') {
      render();
    }
  });
  zippy.updater.onNotAvailable(() => {
    state.updateStatus = 'You are on the latest version.';
    if (activeMode === 'inspector') {
      render();
    }
  });
  zippy.updater.onProgress((progress) => {
    state.updateStatus = `Downloading update… ${Math.round(progress.percent)}%`;
    if (activeMode === 'inspector') {
      render();
    }
  });
  zippy.updater.onDownloaded((info) => {
    state.updateStatus = `Update ${info.version} ready to install.`;
    state.installUpdateReady = true;
    if (activeMode === 'inspector') {
      render();
    }
  });
  zippy.updater.onError((payload) => {
    state.updateStatus = payload.message;
    if (activeMode === 'inspector') {
      render();
    }
  });

  const status = await zippy.probe.status();
  setStatus(status.connected ? `Connected to ${status.url}` : 'Waiting for device', status.connected);
  setMode('inspector');
  setPanel('device');
}
