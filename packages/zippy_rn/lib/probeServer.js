"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProbeServer = void 0;
const protocol_1 = require("./protocol");
const wsServer_1 = require("./ws/wsServer");
class ProbeServer {
    constructor(deviceCollector, mmkvCollector, sqliteCollector, networkCollector, perfCollector) {
        this.deviceCollector = deviceCollector;
        this.mmkvCollector = mmkvCollector;
        this.sqliteCollector = sqliteCollector;
        this.networkCollector = networkCollector;
        this.perfCollector = perfCollector;
        this.ws = null;
        this.clients = new Set();
        this.port = null;
    }
    async start(port = protocol_1.DEFAULT_PROBE_PORT) {
        if (this.ws) {
            return this.port ?? port;
        }
        this.ws = new wsServer_1.WsServer({
            port,
            path: '/probe',
            onConnection: (conn) => {
                this.clients.add(conn);
                this.broadcastEvent(protocol_1.EventType.CONNECTED, {
                    clientCount: this.clients.size,
                });
            },
            onMessage: (conn, text) => {
                void this.handleMessage(conn, text);
            },
            onClose: (conn) => {
                this.clients.delete(conn);
            },
        });
        const boundPort = await this.ws.start();
        this.port = boundPort;
        this.perfCollector.start();
        return boundPort;
    }
    async stop() {
        this.perfCollector.stop();
        await this.ws?.stop();
        this.ws = null;
        this.clients.clear();
        this.port = null;
    }
    broadcastEvent(type, payload) {
        const event = (0, protocol_1.createEvent)(type, payload);
        const encoded = JSON.stringify(event);
        for (const client of [...this.clients]) {
            try {
                client.sendText(encoded);
            }
            catch {
                this.clients.delete(client);
            }
        }
    }
    async handleMessage(conn, text) {
        try {
            const decoded = JSON.parse(text);
            const response = await this.dispatch(decoded);
            if (response) {
                conn.sendText(JSON.stringify(response));
            }
        }
        catch (error) {
            conn.sendText(JSON.stringify((0, protocol_1.createResponse)('unknown', null, {
                code: 'bad_request',
                message: error instanceof Error ? error.message : String(error),
            })));
        }
    }
    async dispatch(message) {
        if (message.kind !== protocol_1.MessageKind.REQUEST) {
            return null;
        }
        const id = typeof message.id === 'string' ? message.id : 'unknown';
        const method = typeof message.method === 'string' ? message.method : '';
        const params = message.params && typeof message.params === 'object'
            ? message.params
            : {};
        try {
            const result = await this.handleMethod(method, params);
            return (0, protocol_1.createResponse)(id, result);
        }
        catch (error) {
            return (0, protocol_1.createResponse)(id, null, {
                code: 'probe_error',
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async handleMethod(method, params) {
        switch (method) {
            case protocol_1.Method.PING:
                return { ok: true, ts: Date.now() };
            case protocol_1.Method.DEVICE_INFO:
                return this.deviceCollector.collect();
            case protocol_1.Method.MMKV_LIST_INSTANCES:
                return { instances: await this.mmkvCollector.listInstances() };
            case protocol_1.Method.MMKV_LIST_KEYS:
                return {
                    keys: await this.mmkvCollector.listKeys(String(params.instanceId ?? 'default')),
                };
            case protocol_1.Method.MMKV_GET:
                return {
                    entry: await this.mmkvCollector.getValue(String(params.instanceId ?? 'default'), String(params.key ?? '')),
                };
            case protocol_1.Method.SQLITE_LIST_DATABASES:
                return { databases: await this.sqliteCollector.listDatabases() };
            case protocol_1.Method.SQLITE_LIST_TABLES:
                return {
                    tables: await this.sqliteCollector.listTables(String(params.databaseId)),
                };
            case protocol_1.Method.SQLITE_SCHEMA:
                return {
                    columns: await this.sqliteCollector.schema(String(params.databaseId), String(params.table)),
                };
            case protocol_1.Method.SQLITE_QUERY:
                return this.sqliteCollector.query(String(params.databaseId), String(params.table), typeof params.limit === 'number'
                    ? params.limit
                    : protocol_1.DEFAULT_SQLITE_ROW_LIMIT, typeof params.offset === 'number' ? params.offset : 0);
            case protocol_1.Method.NETWORK_LIST:
                return { events: this.networkCollector.list() };
            case protocol_1.Method.PERF_LATEST:
                return this.perfCollector.latest();
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }
}
exports.ProbeServer = ProbeServer;
