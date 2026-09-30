import { open, save } from '@tauri-apps/plugin-dialog';
import { escapeHtml } from '../lib/format';
import { toolsApi } from '../lib/tools';
import type { ToolsDevice } from '../types/tools';

const MAX_LOG_LINES = 2000;

const IOS_PRIVACY = [
  'photos',
  'photos-add',
  'camera',
  'microphone',
  'location',
  'location-always',
  'contacts',
  'calendar',
  'reminders',
  'media-library',
  'faceid',
  'user-tracking',
  'all',
];

const ANDROID_PERMS = [
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
];

export type ToolsState = {
  devices: ToolsDevice[];
  avds: string[];
  packages: string[];
  selectedDeviceId: string | null;
  forwardPort: number;
  reversePort: number;
  packageId: string;
  url: string;
  inputText: string;
  permission: string;
  lat: string;
  lon: string;
  logFilter: string;
  logLines: string[];
  logRunning: boolean;
  recordRunning: boolean;
  recordPath: string | null;
  screenshotDataUrl: string | null;
  error: string | null;
  notice: string | null;
  busy: boolean;
};

export type ToolsController = {
  state: ToolsState;
  bootstrap: () => Promise<void>;
  render: () => void;
  dispose: () => void;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    try {
      return JSON.stringify(error);
    } catch {
      /* ignore */
    }
  }
  return 'Unexpected error';
}

export function createToolsState(): ToolsState {
  return {
    devices: [],
    avds: [],
    packages: [],
    selectedDeviceId: null,
    forwardPort: 9876,
    reversePort: 8081,
    packageId: '',
    url: '',
    inputText: '',
    permission: '',
    lat: '37.7749',
    lon: '-122.4194',
    logFilter: '',
    logLines: [],
    logRunning: false,
    recordRunning: false,
    recordPath: null,
    screenshotDataUrl: null,
    error: null,
    notice: null,
    busy: false,
  };
}

export function mountToolsPanel(root: HTMLElement): ToolsController {
  const state = createToolsState();
  const unsubs: Array<() => void> = [];
  let pendingLogLines: string[] = [];
  let logFlushScheduled = false;

  function selectedDevice(): ToolsDevice | null {
    return state.devices.find((d) => d.id === state.selectedDeviceId) ?? null;
  }

  function readInputsFromDom(): void {
    const g = (id: string) => root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id);
    const port = Number(g('#tools-forward-port')?.value);
    if (Number.isFinite(port) && port > 0) state.forwardPort = port;
    const rev = Number(g('#tools-reverse-port')?.value);
    if (Number.isFinite(rev) && rev > 0) state.reversePort = rev;
    state.packageId = g('#tools-package-id')?.value.trim() ?? state.packageId;
    state.url = g('#tools-url')?.value.trim() ?? state.url;
    state.inputText = g('#tools-input-text')?.value ?? state.inputText;
    state.permission = g('#tools-permission')?.value.trim() ?? state.permission;
    state.lat = g('#tools-lat')?.value.trim() ?? state.lat;
    state.lon = g('#tools-lon')?.value.trim() ?? state.lon;
    state.logFilter = g('#tools-log-filter')?.value ?? state.logFilter;
  }

  async function refreshDevices(): Promise<void> {
    const [devices, avds] = await Promise.all([
      toolsApi.listDevices(),
      toolsApi.listAvds().catch(() => [] as string[]),
    ]);
    state.devices = devices;
    state.avds = avds;
    if (
      state.selectedDeviceId &&
      !state.devices.some((d) => d.id === state.selectedDeviceId)
    ) {
      state.selectedDeviceId = null;
    }
    if (!state.selectedDeviceId && state.devices.length > 0) {
      const booted =
        state.devices.find((d) => d.state === 'Booted' || d.state === 'device') ??
        state.devices[0];
      state.selectedDeviceId = booted.id;
    }
  }

  async function refreshPackages(): Promise<void> {
    if (!state.selectedDeviceId) {
      state.packages = [];
      return;
    }
    state.packages = await toolsApi.listPackages(state.selectedDeviceId);
  }

  async function bootstrap(): Promise<void> {
    state.error = null;
    try {
      await refreshDevices();
      if (state.selectedDeviceId) {
        await refreshPackages().catch(() => {
          state.packages = [];
        });
      }
    } catch (error) {
      state.error = errorMessage(error);
    }
    render();
  }

  async function run(action: () => Promise<void>): Promise<void> {
    readInputsFromDom();
    state.busy = true;
    state.error = null;
    state.notice = null;
    render();
    try {
      await action();
    } catch (error) {
      state.error = errorMessage(error);
    } finally {
      state.busy = false;
      render();
    }
  }

  function syncLogControls(): void {
    const startBtn = root.querySelector<HTMLButtonElement>('#tools-log-start');
    const stopBtn = root.querySelector<HTMLButtonElement>('#tools-log-stop');
    const clearBtn = root.querySelector<HTMLButtonElement>('#tools-log-clear');
    const filterInput = root.querySelector<HTMLInputElement>('#tools-log-filter');
    if (startBtn) startBtn.disabled = state.busy || !state.selectedDeviceId || state.logRunning;
    if (stopBtn) stopBtn.disabled = !state.logRunning;
    if (clearBtn) clearBtn.disabled = state.logLines.length === 0 && pendingLogLines.length === 0;
    if (filterInput) filterInput.disabled = state.logRunning;
  }

  function absorbPendingLogs(): void {
    if (pendingLogLines.length === 0) return;
    state.logLines.push(...pendingLogLines);
    pendingLogLines = [];
    logFlushScheduled = false;
    if (state.logLines.length > MAX_LOG_LINES) {
      state.logLines = state.logLines.slice(-MAX_LOG_LINES);
    }
  }

  function flushLogLines(): void {
    logFlushScheduled = false;
    if (pendingLogLines.length === 0) return;
    const chunk = pendingLogLines;
    pendingLogLines = [];
    state.logLines.push(...chunk);
    if (state.logLines.length > MAX_LOG_LINES) {
      state.logLines = state.logLines.slice(-MAX_LOG_LINES);
    }
    const el = root.querySelector('#tools-log-output');
    if (!el) return;
    if (state.logLines.length >= MAX_LOG_LINES) {
      el.textContent = state.logLines.join('\n');
    } else {
      el.append(`${chunk.join('\n')}\n`);
    }
    el.scrollTop = el.scrollHeight;
    syncLogControls();
  }

  function enqueueLogLines(lines: string[]): void {
    if (lines.length === 0) return;
    pendingLogLines.push(...lines);
    if (!logFlushScheduled) {
      logFlushScheduled = true;
      window.setTimeout(flushLogLines, 50);
    }
  }

  unsubs.push(toolsApi.onLogBatch((payload) => enqueueLogLines(payload.lines ?? [])));
  unsubs.push(
    toolsApi.onLogStatus((payload) => {
      state.logRunning = payload.running;
      syncLogControls();
    }),
  );
  unsubs.push(
    toolsApi.onRecordStatus((payload) => {
      state.recordRunning = payload.running;
      if (payload.path) state.recordPath = payload.path;
      const startBtn = root.querySelector<HTMLButtonElement>('#tools-record-start');
      const stopBtn = root.querySelector<HTMLButtonElement>('#tools-record-stop');
      if (startBtn) startBtn.disabled = state.busy || !state.selectedDeviceId || state.recordRunning;
      if (stopBtn) stopBtn.disabled = !state.recordRunning;
    }),
  );

  function requireDevice(): string {
    if (!state.selectedDeviceId) throw new Error('Select a device first');
    return state.selectedDeviceId;
  }

  function requirePackage(): string {
    readInputsFromDom();
    if (!state.packageId) throw new Error('Enter or pick a package / bundle id');
    return state.packageId;
  }

  function render(): void {
    absorbPendingLogs();
    const device = selectedDevice();
    const isAndroid = device?.platform === 'android';
    const isIos = device?.platform === 'ios-sim';
    const canAct = Boolean(device) && !state.busy;
    const permOptions = isIos ? IOS_PRIVACY : ANDROID_PERMS;
    if (!state.permission && permOptions.length) {
      state.permission = permOptions[0];
    }

    root.innerHTML = `
      <div class="tools-shell">
        <aside class="tools-col tools-col-devices">
          <div class="tools-col-header">
            <h2>Devices</h2>
            <button class="btn" type="button" id="tools-refresh" ${state.busy ? 'disabled' : ''}>Refresh</button>
          </div>
          <div class="tools-panel-body">
            ${
              state.devices.length === 0
                ? '<div class="empty-inline">No devices. Connect Android or boot an iOS Simulator.</div>'
                : `<div class="tools-device-list">
                ${state.devices
                  .map((d) => {
                    const active = d.id === state.selectedDeviceId ? 'is-active' : '';
                    return `<button class="tools-device-item ${active}" type="button" data-device-id="${escapeHtml(d.id)}">
                      <span class="tools-device-name">${escapeHtml(d.name)}</span>
                      <span class="tools-device-meta">${escapeHtml(d.platform)} · ${escapeHtml(d.state)}</span>
                      <span class="tools-device-id">${escapeHtml(d.id)}</span>
                    </button>`;
                  })
                  .join('')}
              </div>`
            }
            <div class="tools-side-actions">
              <button class="btn" type="button" id="tools-boot" ${canAct && isIos && device?.state !== 'Booted' ? '' : 'disabled'}>Boot sim</button>
              <button class="btn" type="button" id="tools-shutdown" ${canAct ? '' : 'disabled'}>Shutdown</button>
            </div>
            ${
              state.avds.length
                ? `<label class="tools-avd-label">Android AVD
                    <select id="tools-avd">
                      ${state.avds.map((a) => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('')}
                    </select>
                  </label>
                  <button class="btn" type="button" id="tools-boot-avd" ${state.busy ? 'disabled' : ''}>Start AVD</button>`
                : ''
            }
          </div>
        </aside>

        <section class="tools-col tools-col-main">
          <div class="tools-col-header"><h2>Actions</h2></div>
          <div class="tools-panel-body tools-actions-grid">
            <section class="card">
              <h3>Ports</h3>
              <p class="hint">Forward = host→device (Zippy probe). Reverse = device→host (Metro 8081).</p>
              <div class="tools-inline">
                <label>Forward<input id="tools-forward-port" type="number" min="1" max="65535" value="${escapeHtml(state.forwardPort)}" ${isAndroid ? '' : 'disabled'} /></label>
                <button class="btn primary" type="button" id="tools-forward" ${canAct && isAndroid ? '' : 'disabled'}>Forward</button>
                <button class="btn" type="button" id="tools-forward-remove" ${canAct && isAndroid ? '' : 'disabled'}>Remove</button>
              </div>
              <div class="tools-inline">
                <label>Reverse<input id="tools-reverse-port" type="number" min="1" max="65535" value="${escapeHtml(state.reversePort)}" ${isAndroid ? '' : 'disabled'} /></label>
                <button class="btn primary" type="button" id="tools-reverse" ${canAct && isAndroid ? '' : 'disabled'}>Reverse</button>
                <button class="btn" type="button" id="tools-reverse-remove" ${canAct && isAndroid ? '' : 'disabled'}>Remove</button>
              </div>
            </section>

            <section class="card">
              <h3>Capture</h3>
              <div class="actions">
                <button class="btn primary" type="button" id="tools-screenshot" ${canAct ? '' : 'disabled'}>Screenshot</button>
                <button class="btn" type="button" id="tools-screenshot-save" ${state.screenshotDataUrl && !state.busy ? '' : 'disabled'}>Save PNG…</button>
                <button class="btn" type="button" id="tools-record-start" ${canAct && !state.recordRunning ? '' : 'disabled'}>Record</button>
                <button class="btn" type="button" id="tools-record-stop" ${state.recordRunning ? '' : 'disabled'}>Stop record</button>
              </div>
              ${state.recordPath ? `<p class="hint">Last recording: <code>${escapeHtml(state.recordPath)}</code></p>` : ''}
              <div class="tools-screenshot-preview">
                ${
                  state.screenshotDataUrl
                    ? `<img src="${state.screenshotDataUrl}" alt="Screenshot preview" />`
                    : '<div class="empty-inline">No screenshot yet.</div>'
                }
              </div>
            </section>

            <section class="card">
              <h3>App</h3>
              <div class="tools-inline">
                <label class="grow">Package / Bundle ID
                  <input id="tools-package-id" list="tools-package-list" type="text" value="${escapeHtml(state.packageId)}" placeholder="com.example.app" ${canAct ? '' : 'disabled'} />
                  <datalist id="tools-package-list">
                    ${state.packages.map((p) => `<option value="${escapeHtml(p)}"></option>`).join('')}
                  </datalist>
                </label>
                <button class="btn" type="button" id="tools-packages-refresh" ${canAct ? '' : 'disabled'}>List pkgs</button>
              </div>
              <div class="actions">
                <button class="btn primary" type="button" id="tools-install" ${canAct ? '' : 'disabled'}>Install…</button>
                <button class="btn" type="button" id="tools-launch" ${canAct ? '' : 'disabled'}>Launch</button>
                <button class="btn" type="button" id="tools-restart" ${canAct ? '' : 'disabled'}>Restart</button>
                <button class="btn" type="button" id="tools-force-stop" ${canAct ? '' : 'disabled'}>Force stop</button>
                <button class="btn" type="button" id="tools-clear" ${canAct && isAndroid ? '' : 'disabled'}>Clear data</button>
                <button class="btn danger" type="button" id="tools-uninstall" ${canAct ? '' : 'disabled'}>Uninstall</button>
              </div>
            </section>

            <section class="card">
              <h3>Media / URL</h3>
              <div class="actions">
                <button class="btn primary" type="button" id="tools-add-media" ${canAct ? '' : 'disabled'}>Import photo/video…</button>
              </div>
              <label>Open URL / deeplink
                <input id="tools-url" type="text" value="${escapeHtml(state.url)}" placeholder="myapp://path or https://…" ${canAct ? '' : 'disabled'} />
              </label>
              <div class="actions">
                <button class="btn primary" type="button" id="tools-open-url" ${canAct ? '' : 'disabled'}>Open</button>
              </div>
              <label>Type text (Android)
                <input id="tools-input-text" type="text" value="${escapeHtml(state.inputText)}" ${canAct && isAndroid ? '' : 'disabled'} />
              </label>
              <div class="actions">
                <button class="btn" type="button" id="tools-type" ${canAct && isAndroid ? '' : 'disabled'}>Send text</button>
              </div>
            </section>

            <section class="card">
              <h3>Permissions / Location / Appearance</h3>
              <label>Permission
                <select id="tools-permission" ${canAct ? '' : 'disabled'}>
                  ${permOptions
                    .map(
                      (p) =>
                        `<option value="${escapeHtml(p)}" ${state.permission === p ? 'selected' : ''}>${escapeHtml(p)}</option>`,
                    )
                    .join('')}
                </select>
              </label>
              <div class="actions">
                <button class="btn primary" type="button" id="tools-perm-grant" ${canAct ? '' : 'disabled'}>Grant</button>
                <button class="btn" type="button" id="tools-perm-revoke" ${canAct ? '' : 'disabled'}>Revoke</button>
              </div>
              <div class="tools-inline">
                <label>Lat<input id="tools-lat" type="text" value="${escapeHtml(state.lat)}" ${canAct ? '' : 'disabled'} /></label>
                <label>Lon<input id="tools-lon" type="text" value="${escapeHtml(state.lon)}" ${canAct ? '' : 'disabled'} /></label>
                <button class="btn" type="button" id="tools-location" ${canAct ? '' : 'disabled'}>Set location</button>
              </div>
              <div class="actions">
                <button class="btn" type="button" id="tools-appearance-light" ${canAct ? '' : 'disabled'}>Light</button>
                <button class="btn" type="button" id="tools-appearance-dark" ${canAct ? '' : 'disabled'}>Dark</button>
              </div>
            </section>

            ${state.error ? `<div class="tools-banner tools-banner-error">${escapeHtml(state.error)}</div>` : ''}
            ${state.notice ? `<div class="tools-banner tools-banner-notice">${escapeHtml(state.notice)}</div>` : ''}
          </div>
        </section>

        <section class="tools-col tools-col-logs">
          <div class="tools-col-header">
            <h2>Logs</h2>
            <div class="actions">
              <button class="btn primary" type="button" id="tools-log-start" ${canAct && !state.logRunning ? '' : 'disabled'}>Start</button>
              <button class="btn" type="button" id="tools-log-stop" ${state.logRunning ? '' : 'disabled'}>Stop</button>
              <button class="btn" type="button" id="tools-log-clear" ${state.logLines.length ? '' : 'disabled'}>Clear</button>
            </div>
          </div>
          <div class="tools-panel-body tools-log-body">
            <label>
              Filter
              <input id="tools-log-filter" type="text" value="${escapeHtml(state.logFilter)}" placeholder="${isAndroid ? 'MyTag:D *:S' : 'optional text'}" ${state.logRunning ? 'disabled' : ''} />
            </label>
            <pre class="tools-log-output" id="tools-log-output">${escapeHtml(state.logLines.join('\n'))}</pre>
          </div>
        </section>
      </div>
    `;

    bindEvents(device, isAndroid);
  }

  function bindEvents(device: ToolsDevice | null, isAndroid: boolean): void {
    root.querySelector('#tools-refresh')?.addEventListener('click', () => {
      void run(async () => {
        await refreshDevices();
        state.notice = `Found ${state.devices.length} device(s)`;
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-device-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedDeviceId = btn.dataset.deviceId ?? null;
        state.packages = [];
        void run(async () => {
          await refreshPackages().catch(() => {
            state.packages = [];
          });
        });
      });
    });

    root.querySelector('#tools-boot')?.addEventListener('click', () => {
      void run(async () => {
        const id = requireDevice();
        state.notice = await toolsApi.bootDevice(id);
        await refreshDevices();
      });
    });

    root.querySelector('#tools-shutdown')?.addEventListener('click', () => {
      void run(async () => {
        const id = requireDevice();
        if (!window.confirm('Shutdown / power off this device?')) return;
        state.notice = await toolsApi.shutdownDevice(id);
        await refreshDevices();
      });
    });

    root.querySelector('#tools-boot-avd')?.addEventListener('click', () => {
      void run(async () => {
        const sel = root.querySelector<HTMLSelectElement>('#tools-avd');
        const name = sel?.value;
        if (!name) throw new Error('Pick an AVD');
        state.notice = await toolsApi.bootDevice(name);
      });
    });

    root.querySelector('#tools-forward')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.adbForward(state.selectedDeviceId, state.forwardPort);
      });
    });
    root.querySelector('#tools-forward-remove')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.adbForwardRemove(state.selectedDeviceId, state.forwardPort);
      });
    });
    root.querySelector('#tools-reverse')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.adbReverse(state.selectedDeviceId, state.reversePort);
      });
    });
    root.querySelector('#tools-reverse-remove')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.adbReverseRemove(state.selectedDeviceId, state.reversePort);
      });
    });

    root.querySelector('#tools-screenshot')?.addEventListener('click', () => {
      void run(async () => {
        const id = requireDevice();
        const shot = await toolsApi.screenshot(id);
        state.screenshotDataUrl = `data:${shot.mime};base64,${shot.base64}`;
        state.notice = 'Screenshot captured';
      });
    });

    root.querySelector('#tools-screenshot-save')?.addEventListener('click', () => {
      void run(async () => {
        if (!state.screenshotDataUrl) return;
        const path = await save({
          title: 'Save screenshot',
          defaultPath: `zippy-screenshot-${Date.now()}.png`,
          filters: [{ name: 'PNG', extensions: ['png'] }],
        });
        if (!path) return;
        const base64 = state.screenshotDataUrl.split(',')[1];
        if (!base64) throw new Error('Screenshot data missing');
        state.notice = await toolsApi.saveFile(path, base64);
      });
    });

    root.querySelector('#tools-record-start')?.addEventListener('click', () => {
      void (async () => {
        try {
          const id = requireDevice();
          state.recordRunning = true;
          render();
          await toolsApi.recordStart(id);
          state.notice = 'Recording…';
          render();
        } catch (error) {
          state.recordRunning = false;
          state.error = errorMessage(error);
          render();
        }
      })();
    });

    root.querySelector('#tools-record-stop')?.addEventListener('click', () => {
      void (async () => {
        try {
          const path = await toolsApi.recordStop();
          state.recordRunning = false;
          state.recordPath = path;
          state.notice = `Recording saved: ${path}`;
          render();
        } catch (error) {
          state.error = errorMessage(error);
          render();
        }
      })();
    });

    root.querySelector('#tools-packages-refresh')?.addEventListener('click', () => {
      void run(async () => {
        await refreshPackages();
        state.notice = `${state.packages.length} package(s)`;
      });
    });

    root.querySelector('#tools-install')?.addEventListener('click', () => {
      void run(async () => {
        const id = requireDevice();
        const selected = isAndroid
          ? await open({
              multiple: false,
              title: 'Select APK',
              filters: [{ name: 'APK', extensions: ['apk'] }],
            })
          : await open({ multiple: false, directory: true, title: 'Select .app bundle' });
        if (!selected || Array.isArray(selected)) return;
        state.notice = await toolsApi.install(id, selected);
        await refreshPackages().catch(() => undefined);
      });
    });

    root.querySelector('#tools-launch')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.launchApp(requireDevice(), requirePackage());
      });
    });
    root.querySelector('#tools-restart')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.restartApp(requireDevice(), requirePackage());
      });
    });
    root.querySelector('#tools-force-stop')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.forceStop(requireDevice(), requirePackage());
      });
    });
    root.querySelector('#tools-clear')?.addEventListener('click', () => {
      void run(async () => {
        const pkg = requirePackage();
        if (!window.confirm(`Clear data for ${pkg}?`)) return;
        state.notice = await toolsApi.clearData(requireDevice(), pkg);
      });
    });
    root.querySelector('#tools-uninstall')?.addEventListener('click', () => {
      void run(async () => {
        const pkg = requirePackage();
        if (!window.confirm(`Uninstall ${pkg}?`)) return;
        state.notice = await toolsApi.uninstall(requireDevice(), pkg);
        await refreshPackages().catch(() => undefined);
      });
    });

    root.querySelector('#tools-add-media')?.addEventListener('click', () => {
      void run(async () => {
        const selected = await open({
          multiple: false,
          title: 'Select photo or video',
          filters: [
            { name: 'Media', extensions: ['jpg', 'jpeg', 'png', 'gif', 'heic', 'webp', 'mp4', 'mov', 'm4v'] },
          ],
        });
        if (!selected || Array.isArray(selected)) return;
        state.notice = await toolsApi.addMedia(requireDevice(), selected);
      });
    });

    root.querySelector('#tools-open-url')?.addEventListener('click', () => {
      void run(async () => {
        if (!state.url) throw new Error('Enter a URL');
        state.notice = await toolsApi.openUrl(requireDevice(), state.url);
      });
    });
    root.querySelector('#tools-type')?.addEventListener('click', () => {
      void run(async () => {
        if (!state.inputText.trim()) throw new Error('Enter text');
        state.notice = await toolsApi.inputText(requireDevice(), state.inputText);
      });
    });

    root.querySelector('#tools-perm-grant')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.permissionSet(
          requireDevice(),
          requirePackage(),
          state.permission,
          true,
        );
      });
    });
    root.querySelector('#tools-perm-revoke')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.permissionSet(
          requireDevice(),
          requirePackage(),
          state.permission,
          false,
        );
      });
    });
    root.querySelector('#tools-location')?.addEventListener('click', () => {
      void run(async () => {
        const lat = Number(state.lat);
        const lon = Number(state.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Invalid lat/lon');
        state.notice = await toolsApi.setLocation(requireDevice(), lat, lon);
      });
    });
    root.querySelector('#tools-appearance-light')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.setAppearance(requireDevice(), 'light');
      });
    });
    root.querySelector('#tools-appearance-dark')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = await toolsApi.setAppearance(requireDevice(), 'dark');
      });
    });

    root.querySelector('#tools-log-start')?.addEventListener('click', () => {
      void (async () => {
        if (!state.selectedDeviceId || state.logRunning) return;
        readInputsFromDom();
        state.error = null;
        state.logRunning = true;
        syncLogControls();
        try {
          await toolsApi.logStart(state.selectedDeviceId, state.logFilter || null);
          state.notice = 'Log stream started';
          render();
        } catch (error) {
          state.logRunning = false;
          state.error = errorMessage(error);
          render();
        }
      })();
    });
    root.querySelector('#tools-log-stop')?.addEventListener('click', () => {
      void (async () => {
        try {
          await toolsApi.logStop();
          state.logRunning = false;
          state.notice = 'Log stream stopped';
          flushLogLines();
          render();
        } catch (error) {
          state.error = errorMessage(error);
          render();
        }
      })();
    });
    root.querySelector('#tools-log-clear')?.addEventListener('click', () => {
      pendingLogLines = [];
      state.logLines = [];
      const el = root.querySelector('#tools-log-output');
      if (el) el.textContent = '';
      syncLogControls();
    });

    void device;
  }

  return {
    state,
    bootstrap,
    render,
    dispose: () => {
      unsubs.forEach((fn) => fn());
      void toolsApi.logStop().catch(() => undefined);
      if (state.recordRunning) {
        void toolsApi.recordStop().catch(() => undefined);
      }
    },
  };
}
