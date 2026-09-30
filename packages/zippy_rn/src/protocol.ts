export const PROTOCOL_VERSION = 1;
export const DEFAULT_PROBE_PORT = 9876;
export const MAX_NETWORK_BODY_BYTES = 8192;
export const MAX_NETWORK_EVENTS = 500;
export const MAX_PERF_SAMPLES = 120;
export const DEFAULT_SQLITE_ROW_LIMIT = 200;

export const MessageKind = {
  REQUEST: 'request',
  RESPONSE: 'response',
  EVENT: 'event',
} as const;

export const Method = {
  PING: 'ping',
  DEVICE_INFO: 'device.info',
  MMKV_LIST_INSTANCES: 'mmkv.listInstances',
  MMKV_LIST_KEYS: 'mmkv.listKeys',
  MMKV_GET: 'mmkv.get',
  SQLITE_LIST_DATABASES: 'sqlite.listDatabases',
  SQLITE_LIST_TABLES: 'sqlite.listTables',
  SQLITE_SCHEMA: 'sqlite.schema',
  SQLITE_QUERY: 'sqlite.query',
  NETWORK_LIST: 'network.list',
  PERF_LATEST: 'perf.latest',
} as const;

export const EventType = {
  CONNECTED: 'probe.connected',
  DEVICE_INFO: 'device.info',
  NETWORK_EVENT: 'network.event',
  PERF_SAMPLE: 'perf.sample',
  ERROR: 'probe.error',
} as const;

export function createResponse(
  id: string,
  result: unknown = null,
  error: { code: string; message: string } | null = null,
): Record<string, unknown> {
  return {
    v: PROTOCOL_VERSION,
    kind: MessageKind.RESPONSE,
    id,
    result: error ? null : result,
    error,
  };
}

export function createEvent(
  type: string,
  payload: unknown = null,
): Record<string, unknown> {
  return {
    v: PROTOCOL_VERSION,
    kind: MessageKind.EVENT,
    type,
    payload,
    ts: Date.now(),
  };
}

export function truncateBody(
  body: string | null | undefined,
  max = MAX_NETWORK_BODY_BYTES,
): string {
  if (body == null) {
    return '';
  }
  if (body.length <= max) {
    return body;
  }
  return `${body.slice(0, max)}… [truncated]`;
}
