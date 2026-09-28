export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function formatTime(ts: unknown): string {
  if (!ts) {
    return '—';
  }
  return new Date(ts as string | number).toLocaleTimeString();
}

export function formatBytes(bytes: unknown): string {
  if (!bytes) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function renderKeyValueTable(obj: Record<string, unknown> | null | undefined): string {
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
