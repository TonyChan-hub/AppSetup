export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function formatTime(ts) {
  if (!ts) {
    return '—';
  }
  return new Date(ts).toLocaleTimeString();
}

export function formatBytes(bytes) {
  if (!bytes) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function renderKeyValueTable(obj) {
  if (!obj || typeof obj !== 'object') {
    return '<div class="empty-inline">No data</div>';
  }

  const rows = Object.entries(obj)
    .map(
      ([key, value]) => `
        <tr>
          <th>${escapeHtml(key)}</th>
          <td><pre class="code-block">${escapeHtml(
            typeof value === 'object' ? JSON.stringify(value, null, 2) : value,
          )}</pre></td>
        </tr>`,
    )
    .join('');

  return `<table class="data-table">${rows}</table>`;
}

export function renderDataGrid(columns, rows) {
  if (!rows?.length) {
    return '<div class="empty-inline">No rows</div>';
  }

  const head = columns.map((col) => `<th>${escapeHtml(col)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((col) => `<td>${escapeHtml(row[col] ?? '')}</td>`)
          .join('')}</tr>`,
    )
    .join('');

  return `<div class="table-wrap"><table class="data-table grid-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
