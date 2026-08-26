import { escapeHtml, formatBytes, formatTime, renderKeyValueTable } from '../lib/format.js';

export function renderDevicePanel(root, state, actions) {
  root.innerHTML = `
    <div class="panel-grid">
      <section class="card">
        <h2>Connect</h2>
        <form class="form" id="device-connect-form">
          <label>
            Host
            <input name="host" type="text" value="${escapeHtml(state.host)}" placeholder="127.0.0.1" />
          </label>
          <label>
            Port
            <input name="port" type="number" value="${escapeHtml(state.port)}" min="1" max="65535" />
          </label>
          <div class="actions">
            <button class="btn primary" type="submit">${state.connected ? 'Reconnect' : 'Connect'}</button>
            <button class="btn" type="button" id="device-disconnect" ${state.connected ? '' : 'disabled'}>Disconnect</button>
            <button class="btn" type="button" id="device-refresh">Refresh device info</button>
          </div>
          <p class="hint">Android emulator from desktop: use the device LAN IP. iOS Simulator: <code>127.0.0.1</code>.</p>
        </form>
      </section>
      <section class="card">
        <h2>Device info</h2>
        <div id="device-info">${state.deviceInfo ? renderKeyValueTable(flattenDeviceInfo(state.deviceInfo)) : '<div class="empty-inline">Connect to load device info.</div>'}</div>
      </section>
      <section class="card">
        <h2>Updates</h2>
        <div class="actions">
          <button class="btn" type="button" id="device-check-update">Check for updates</button>
          <button class="btn primary" type="button" id="device-install-update" hidden>Restart to update</button>
        </div>
        <p id="device-update-status" class="hint">${escapeHtml(state.updateStatus)}</p>
      </section>
    </div>
  `;

  root.querySelector('#device-connect-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await actions.connect({
      host: String(data.get('host') ?? ''),
      port: Number(data.get('port') ?? 9876),
    });
  });

  root.querySelector('#device-disconnect')?.addEventListener('click', () => actions.disconnect());
  root.querySelector('#device-refresh')?.addEventListener('click', () => actions.refreshDevice());
  root.querySelector('#device-check-update')?.addEventListener('click', () => actions.checkUpdate());
  root.querySelector('#device-install-update')?.addEventListener('click', () => actions.installUpdate());
}

function flattenDeviceInfo(info) {
  const flat = {};
  if (info.app) {
    for (const [key, value] of Object.entries(info.app)) {
      flat[`app.${key}`] = value;
    }
  }
  if (info.platform) {
    for (const [key, value] of Object.entries(info.platform)) {
      flat[`platform.${key}`] = value;
    }
  }
  return flat;
}

export function renderKvPanel(root, state, actions) {
  root.innerHTML = `
    <div class="panel-grid">
      <section class="card">
        <div class="card-head">
          <h2>Instances</h2>
          <button class="btn" type="button" id="kv-refresh">Refresh</button>
        </div>
        <div id="kv-instances">${renderInstanceList(state.instances, state.selectedInstanceId)}</div>
      </section>
      <section class="card">
        <div class="card-head">
          <h2>Keys</h2>
          <input class="search" id="kv-search" type="search" placeholder="Filter keys" value="${escapeHtml(state.search)}" />
        </div>
        <div id="kv-keys">${renderKeyList(state.keys, state.search, state.selectedKey)}</div>
      </section>
      <section class="card span-2">
        <h2>Value</h2>
        <div id="kv-value">${state.entry ? renderEntry(state.entry) : '<div class="empty-inline">Select a key.</div>'}</div>
      </section>
    </div>
  `;

  root.querySelector('#kv-refresh')?.addEventListener('click', () => actions.refreshInstances());
  root.querySelector('#kv-search')?.addEventListener('input', (event) => {
    actions.setSearch(event.target.value);
  });

  root.querySelectorAll('[data-instance-id]').forEach((button) => {
    button.addEventListener('click', () => actions.selectInstance(button.dataset.instanceId));
  });

  root.querySelectorAll('[data-key]').forEach((button) => {
    button.addEventListener('click', () => actions.selectKey(button.dataset.key));
  });
}

function renderInstanceList(instances, selectedId) {
  if (!instances?.length) {
    return '<div class="empty-inline">No MMKV instances.</div>';
  }
  return `<div class="list">${instances
    .map(
      (item) => `
      <button class="list-item ${item.id === selectedId ? 'is-active' : ''}" data-instance-id="${escapeHtml(item.id)}" type="button">
        <span>${escapeHtml(item.id)}</span>
        <span class="muted">${formatBytes(item.sizeBytes)}</span>
      </button>`,
    )
    .join('')}</div>`;
}

function renderKeyList(keys, search, selectedKey) {
  const filtered = (keys ?? []).filter((key) => key.toLowerCase().includes((search ?? '').toLowerCase()));
  if (!filtered.length) {
    return '<div class="empty-inline">No keys.</div>';
  }
  return `<div class="list">${filtered
    .map(
      (key) => `
      <button class="list-item ${key === selectedKey ? 'is-active' : ''}" data-key="${escapeHtml(key)}" type="button">${escapeHtml(key)}</button>`,
    )
    .join('')}</div>`;
}

function renderEntry(entry) {
  return `
    <div class="detail-grid">
      <div><span class="label">Key</span><div>${escapeHtml(entry.key)}</div></div>
      <div><span class="label">Type</span><div>${escapeHtml(entry.type)}</div></div>
      <div class="span-2"><span class="label">Value</span><pre class="code-block">${escapeHtml(entry.value)}</pre></div>
    </div>`;
}

export function renderDbPanel(root, state, actions) {
  root.innerHTML = `
    <div class="panel-grid db-grid">
      <section class="card">
        <div class="card-head">
          <h2>Databases</h2>
          <button class="btn" type="button" id="db-refresh">Refresh</button>
        </div>
        <div id="db-databases">${renderSimpleList(state.databases, state.selectedDatabaseId, 'database')}</div>
      </section>
      <section class="card">
        <h2>Tables</h2>
        <div id="db-tables">${renderSimpleList(state.tables, state.selectedTable, 'table')}</div>
      </section>
      <section class="card span-2">
        <h2>Schema</h2>
        <div id="db-schema">${state.schema?.length ? renderSchema(state.schema) : '<div class="empty-inline">Select a table.</div>'}</div>
      </section>
      <section class="card span-2">
        <div class="card-head">
          <h2>Rows</h2>
          <button class="btn" type="button" id="db-reload-rows" ${state.selectedTable ? '' : 'disabled'}>Reload</button>
        </div>
        <div id="db-rows">${state.rows ? renderRows(state.rows) : '<div class="empty-inline">Select a table.</div>'}</div>
      </section>
    </div>
  `;

  root.querySelector('#db-refresh')?.addEventListener('click', () => actions.refreshDatabases());
  root.querySelector('#db-reload-rows')?.addEventListener('click', () => actions.reloadRows());
  bindListActions(root, 'database', (id) => actions.selectDatabase(id));
  bindListActions(root, 'table', (id) => actions.selectTable(id));
}

function renderSimpleList(items, selected, kind) {
  if (!items?.length) {
    return `<div class="empty-inline">No ${kind}s.</div>`;
  }
  return `<div class="list">${items
    .map((item) => {
      const id = typeof item === 'string' ? item : item.id;
      const label = typeof item === 'string' ? item : item.id;
      const meta = typeof item === 'string' ? '' : formatBytes(item.sizeBytes);
      return `
        <button class="list-item ${id === selected ? 'is-active' : ''}" data-${kind}="${escapeHtml(id)}" type="button">
          <span>${escapeHtml(label)}</span>
          ${meta ? `<span class="muted">${meta}</span>` : ''}
        </button>`;
    })
    .join('')}</div>`;
}

function renderSchema(columns) {
  const head = ['name', 'type', 'notnull', 'pk'].map((col) => `<th>${col}</th>`).join('');
  const body = columns
    .map(
      (col) =>
        `<tr><td>${escapeHtml(col.name)}</td><td>${escapeHtml(col.type)}</td><td>${escapeHtml(col.notnull)}</td><td>${escapeHtml(col.pk)}</td></tr>`,
    )
    .join('');
  return `<div class="table-wrap"><table class="data-table grid-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderRows(result) {
  const rows = result.rows ?? [];
  if (!rows.length) {
    return '<div class="empty-inline">Table is empty.</div>';
  }
  const columns = Object.keys(rows[0]);
  const head = columns.map((col) => `<th>${escapeHtml(col)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${columns.map((col) => `<td>${escapeHtml(row[col])}</td>`).join('')}</tr>`,
    )
    .join('');
  return `<div class="table-wrap"><table class="data-table grid-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function bindListActions(root, kind, handler) {
  root.querySelectorAll(`[data-${kind}]`).forEach((button) => {
    button.addEventListener('click', () => handler(button.dataset[kind]));
  });
}

export function renderNetworkPanel(root, state) {
  const events = state.networkEvents ?? [];
  root.innerHTML = `
    <section class="card">
      <div class="card-head">
        <h2>Requests</h2>
        <span class="muted">${events.length} captured</span>
      </div>
      <div class="table-wrap">
        <table class="data-table grid-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Method</th>
              <th>URL</th>
              <th>Status</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${events
              .map(
                (event) => `
              <tr class="network-row" data-event-id="${escapeHtml(event.id)}">
                <td>${formatTime(event.startedAt)}</td>
                <td>${escapeHtml(event.method)}</td>
                <td class="truncate">${escapeHtml(event.url)}</td>
                <td>${escapeHtml(event.status ?? event.error ?? '—')}</td>
                <td>${event.durationMs != null ? `${event.durationMs} ms` : '—'}</td>
              </tr>
              ${
                state.selectedEventId === event.id
                  ? `<tr><td colspan="5">${renderNetworkDetail(event)}</td></tr>`
                  : ''
              }`,
              )
              .join('') || '<tr><td colspan="5"><div class="empty-inline">No requests yet.</div></td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;

  root.querySelectorAll('.network-row').forEach((row) => {
    row.addEventListener('click', () => state.onSelectEvent?.(row.dataset.eventId));
  });
}

function renderNetworkDetail(event) {
  return `
    <div class="detail-grid network-detail">
      <div class="span-2"><span class="label">Request body</span><pre class="code-block">${escapeHtml(event.requestBody || '—')}</pre></div>
      <div class="span-2"><span class="label">Response body</span><pre class="code-block">${escapeHtml(event.responseBody || '—')}</pre></div>
    </div>`;
}

export function renderPerfPanel(root, state) {
  const latest = state.perf?.latest;
  const history = state.perf?.history ?? [];
  root.innerHTML = `
    <div class="panel-grid perf-grid">
      <section class="card metric-card">
        <span class="label">FPS</span>
        <strong>${escapeHtml(latest?.fps ?? '—')}</strong>
      </section>
      <section class="card metric-card">
        <span class="label">Frame time</span>
        <strong>${latest?.frameTimeMs != null ? `${latest.frameTimeMs} ms` : '—'}</strong>
      </section>
      <section class="card metric-card">
        <span class="label">Memory</span>
        <strong>${latest?.rssBytes != null ? formatBytes(latest.rssBytes) : '—'}</strong>
      </section>
      <section class="card span-3">
        <div class="card-head">
          <h2>Recent samples</h2>
          <button class="btn" type="button" id="perf-refresh">Refresh</button>
        </div>
        <div class="sparkline">${renderSparkline(history)}</div>
        <div class="table-wrap">
          <table class="data-table grid-table">
            <thead><tr><th>Time</th><th>FPS</th><th>Frame ms</th><th>Memory</th></tr></thead>
            <tbody>
              ${history
                .slice()
                .reverse()
                .slice(0, 20)
                .map(
                  (sample) =>
                    `<tr><td>${formatTime(sample.ts)}</td><td>${escapeHtml(sample.fps)}</td><td>${escapeHtml(sample.frameTimeMs)}</td><td>${formatBytes(sample.rssBytes)}</td></tr>`,
                )
                .join('') || '<tr><td colspan="4"><div class="empty-inline">No samples yet.</div></td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  root.querySelector('#perf-refresh')?.addEventListener('click', () => state.onRefresh?.());
}

function renderSparkline(history) {
  if (!history.length) {
    return '<div class="empty-inline">Waiting for perf samples…</div>';
  }
  const values = history.map((sample) => Number(sample.fps) || 0);
  const max = Math.max(...values, 1);
  const bars = values
    .slice(-40)
    .map((value) => `<span style="height:${Math.max(4, (value / max) * 100)}%"></span>`)
    .join('');
  return `<div class="sparkline-bars">${bars}</div>`;
}
