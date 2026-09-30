import type { DeviceCollector } from './collectors/deviceCollector';
import type { MmkvCollector } from './collectors/mmkvCollector';
import type { NetworkCollector } from './collectors/networkCollector';
import type { PerfCollector } from './collectors/perfCollector';
import type { SqliteCollector } from './collectors/sqliteCollector';
import {
  DEFAULT_PROBE_PORT,
  DEFAULT_SQLITE_ROW_LIMIT,
  EventType,
  MessageKind,
  Method,
  createEvent,
  createResponse,
} from './protocol';
import { WsServer, type WsConnection } from './ws/wsServer';

export class ProbeServer {
  private ws: WsServer | null = null;
  private readonly clients = new Set<WsConnection>();
  private port: number | null = null;

  constructor(
    private readonly deviceCollector: DeviceCollector,
    private readonly mmkvCollector: MmkvCollector,
    private readonly sqliteCollector: SqliteCollector,
    private readonly networkCollector: NetworkCollector,
    private readonly perfCollector: PerfCollector,
  ) {}

  async start(port = DEFAULT_PROBE_PORT): Promise<number> {
    if (this.ws) {
      return this.port ?? port;
    }

    this.ws = new WsServer({
      port,
      path: '/probe',
      onConnection: (conn) => {
        this.clients.add(conn);
        this.broadcastEvent(EventType.CONNECTED, {
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

  async stop(): Promise<void> {
    this.perfCollector.stop();
    await this.ws?.stop();
    this.ws = null;
    this.clients.clear();
    this.port = null;
  }

  broadcastEvent(type: string, payload: unknown): void {
    const event = createEvent(type, payload);
    const encoded = JSON.stringify(event);
    for (const client of [...this.clients]) {
      try {
        client.sendText(encoded);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  private async handleMessage(conn: WsConnection, text: string): Promise<void> {
    try {
      const decoded = JSON.parse(text) as Record<string, unknown>;
      const response = await this.dispatch(decoded);
      if (response) {
        conn.sendText(JSON.stringify(response));
      }
    } catch (error) {
      conn.sendText(
        JSON.stringify(
          createResponse('unknown', null, {
            code: 'bad_request',
            message: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
    }
  }

  private async dispatch(
    message: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    if (message.kind !== MessageKind.REQUEST) {
      return null;
    }
    const id = typeof message.id === 'string' ? message.id : 'unknown';
    const method = typeof message.method === 'string' ? message.method : '';
    const params =
      message.params && typeof message.params === 'object'
        ? (message.params as Record<string, unknown>)
        : {};

    try {
      const result = await this.handleMethod(method, params);
      return createResponse(id, result);
    } catch (error) {
      return createResponse(id, null, {
        code: 'probe_error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleMethod(
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    switch (method) {
      case Method.PING:
        return { ok: true, ts: Date.now() };
      case Method.DEVICE_INFO:
        return this.deviceCollector.collect();
      case Method.MMKV_LIST_INSTANCES:
        return { instances: await this.mmkvCollector.listInstances() };
      case Method.MMKV_LIST_KEYS:
        return {
          keys: await this.mmkvCollector.listKeys(
            String(params.instanceId ?? 'default'),
          ),
        };
      case Method.MMKV_GET:
        return {
          entry: await this.mmkvCollector.getValue(
            String(params.instanceId ?? 'default'),
            String(params.key ?? ''),
          ),
        };
      case Method.SQLITE_LIST_DATABASES:
        return { databases: await this.sqliteCollector.listDatabases() };
      case Method.SQLITE_LIST_TABLES:
        return {
          tables: await this.sqliteCollector.listTables(
            String(params.databaseId),
          ),
        };
      case Method.SQLITE_SCHEMA:
        return {
          columns: await this.sqliteCollector.schema(
            String(params.databaseId),
            String(params.table),
          ),
        };
      case Method.SQLITE_QUERY:
        return this.sqliteCollector.query(
          String(params.databaseId),
          String(params.table),
          typeof params.limit === 'number'
            ? params.limit
            : DEFAULT_SQLITE_ROW_LIMIT,
          typeof params.offset === 'number' ? params.offset : 0,
        );
      case Method.NETWORK_LIST:
        return { events: this.networkCollector.list() };
      case Method.PERF_LATEST:
        return this.perfCollector.latest();
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
}
