export declare const PROTOCOL_VERSION = 1;
export declare const DEFAULT_PROBE_PORT = 9876;
export declare const MAX_NETWORK_BODY_BYTES = 8192;
export declare const MAX_NETWORK_EVENTS = 500;
export declare const MAX_PERF_SAMPLES = 120;
export declare const DEFAULT_SQLITE_ROW_LIMIT = 200;
export declare const MessageKind: {
    readonly REQUEST: "request";
    readonly RESPONSE: "response";
    readonly EVENT: "event";
};
export declare const Method: {
    readonly PING: "ping";
    readonly DEVICE_INFO: "device.info";
    readonly MMKV_LIST_INSTANCES: "mmkv.listInstances";
    readonly MMKV_LIST_KEYS: "mmkv.listKeys";
    readonly MMKV_GET: "mmkv.get";
    readonly SQLITE_LIST_DATABASES: "sqlite.listDatabases";
    readonly SQLITE_LIST_TABLES: "sqlite.listTables";
    readonly SQLITE_SCHEMA: "sqlite.schema";
    readonly SQLITE_QUERY: "sqlite.query";
    readonly NETWORK_LIST: "network.list";
    readonly PERF_LATEST: "perf.latest";
};
export declare const EventType: {
    readonly CONNECTED: "probe.connected";
    readonly DEVICE_INFO: "device.info";
    readonly NETWORK_EVENT: "network.event";
    readonly PERF_SAMPLE: "perf.sample";
    readonly ERROR: "probe.error";
};
export declare function createResponse(id: string, result?: unknown, error?: {
    code: string;
    message: string;
} | null): Record<string, unknown>;
export declare function createEvent(type: string, payload?: unknown): Record<string, unknown>;
export declare function truncateBody(body: string | null | undefined, max?: number): string;
