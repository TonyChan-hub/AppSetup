"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = exports.Method = exports.MessageKind = exports.DEFAULT_SQLITE_ROW_LIMIT = exports.MAX_PERF_SAMPLES = exports.MAX_NETWORK_EVENTS = exports.MAX_NETWORK_BODY_BYTES = exports.DEFAULT_PROBE_PORT = exports.PROTOCOL_VERSION = void 0;
exports.createResponse = createResponse;
exports.createEvent = createEvent;
exports.truncateBody = truncateBody;
exports.PROTOCOL_VERSION = 1;
exports.DEFAULT_PROBE_PORT = 9876;
exports.MAX_NETWORK_BODY_BYTES = 8192;
exports.MAX_NETWORK_EVENTS = 500;
exports.MAX_PERF_SAMPLES = 120;
exports.DEFAULT_SQLITE_ROW_LIMIT = 200;
exports.MessageKind = {
    REQUEST: 'request',
    RESPONSE: 'response',
    EVENT: 'event',
};
exports.Method = {
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
exports.EventType = {
    CONNECTED: 'probe.connected',
    DEVICE_INFO: 'device.info',
    NETWORK_EVENT: 'network.event',
    PERF_SAMPLE: 'perf.sample',
    ERROR: 'probe.error',
};
function createResponse(id, result = null, error = null) {
    return {
        v: exports.PROTOCOL_VERSION,
        kind: exports.MessageKind.RESPONSE,
        id,
        result: error ? null : result,
        error,
    };
}
function createEvent(type, payload = null) {
    return {
        v: exports.PROTOCOL_VERSION,
        kind: exports.MessageKind.EVENT,
        type,
        payload,
        ts: Date.now(),
    };
}
function truncateBody(body, max = exports.MAX_NETWORK_BODY_BYTES) {
    if (body == null) {
        return '';
    }
    if (body.length <= max) {
        return body;
    }
    return `${body.slice(0, max)}… [truncated]`;
}
