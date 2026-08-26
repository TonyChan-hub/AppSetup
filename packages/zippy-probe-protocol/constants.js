/** @typedef {typeof DEFAULT_PROBE_PORT} ProbePort */

export const PROTOCOL_VERSION = 1;
export const DEFAULT_PROBE_PORT = 9876;

export const MAX_NETWORK_BODY_BYTES = 8192;
export const MAX_NETWORK_EVENTS = 500;
export const MAX_PERF_SAMPLES = 120;
export const DEFAULT_SQLITE_ROW_LIMIT = 200;

/** @enum {string} */
export const MessageKind = {
  REQUEST: 'request',
  RESPONSE: 'response',
  EVENT: 'event',
};

/** @enum {string} */
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
};

/** @enum {string} */
export const EventType = {
  CONNECTED: 'probe.connected',
  DEVICE_INFO: 'device.info',
  NETWORK_EVENT: 'network.event',
  PERF_SAMPLE: 'perf.sample',
  ERROR: 'probe.error',
};
