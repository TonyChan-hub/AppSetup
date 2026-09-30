import { DeviceCollector, type AppInfo } from './collectors/deviceCollector';
import { MmkvCollector, type MmkvReader } from './collectors/mmkvCollector';
import {
  NetworkCollector,
  type NetworkEventInput,
} from './collectors/networkCollector';
import { PerfCollector } from './collectors/perfCollector';
import {
  SqliteCollector,
  type SqliteDbFactory,
} from './collectors/sqliteCollector';
import { attachFetch } from './network/attachFetch';
import { DEFAULT_PROBE_PORT, EventType } from './protocol';
import { ProbeServer } from './probeServer';

export type ZippyStartOptions = {
  port?: number;
  enabled?: boolean;
  appInfo?: AppInfo;
};

const deviceCollector = new DeviceCollector();
const mmkvCollector = new MmkvCollector();
const sqliteCollector = new SqliteCollector();
const networkCollector = new NetworkCollector();
const perfCollector = new PerfCollector();

export class ZippyProbe {
  static readonly instance = new ZippyProbe();

  private server: ProbeServer | null = null;
  private port: number | null = null;
  private perfTimer: ReturnType<typeof setInterval> | null = null;

  static get isEnabled(): boolean {
    return typeof __DEV__ !== 'undefined' && __DEV__;
  }

  static get device(): DeviceCollector {
    return deviceCollector;
  }

  static get mmkv(): MmkvCollector {
    return mmkvCollector;
  }

  static get sqlite(): SqliteCollector {
    return sqliteCollector;
  }

  static get network(): NetworkCollector {
    return networkCollector;
  }

  static get perf(): PerfCollector {
    return perfCollector;
  }

  get isRunning(): boolean {
    return this.server != null;
  }

  getPort(): number | null {
    return this.port;
  }

  static registerMmkvStore(id: string, reader: MmkvReader): void {
    mmkvCollector.registerStore(id, reader);
  }

  static registerSqliteDatabase(
    id: string,
    nameOrPath: string,
    openDb?: SqliteDbFactory,
  ): void {
    sqliteCollector.registerDatabase(id, nameOrPath, openDb);
  }

  static attachFetch = attachFetch;

  static async start(options: ZippyStartOptions = {}): Promise<number | null> {
    const shouldRun = options.enabled ?? ZippyProbe.isEnabled;
    if (!shouldRun) {
      return null;
    }
    if (options.appInfo) {
      deviceCollector.configure(options.appInfo);
    }
    return ZippyProbe.instance._start(options.port ?? DEFAULT_PROBE_PORT);
  }

  static async stop(): Promise<void> {
    return ZippyProbe.instance._stop();
  }

  private async _start(port: number): Promise<number> {
    if (this.server) {
      return this.port ?? port;
    }

    this.server = new ProbeServer(
      deviceCollector,
      mmkvCollector,
      sqliteCollector,
      networkCollector,
      perfCollector,
    );

    this.port = await this.server.start(port);
    this.server.broadcastEvent(
      EventType.DEVICE_INFO,
      await deviceCollector.collect(),
    );
    this.perfTimer = setInterval(() => {
      this.server?.broadcastEvent(EventType.PERF_SAMPLE, perfCollector.latest());
    }, 1000);

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[ZippyProbe] listening on 0.0.0.0:${this.port}/probe`);
    }
    return this.port;
  }

  private async _stop(): Promise<void> {
    if (this.perfTimer) {
      clearInterval(this.perfTimer);
      this.perfTimer = null;
    }
    await this.server?.stop();
    this.server = null;
    this.port = null;
  }

  recordNetworkEvent(event: NetworkEventInput): void {
    networkCollector.record(event);
    this.server?.broadcastEvent(EventType.NETWORK_EVENT, {
      ...event,
      requestBody: event.requestBody ?? '',
      responseBody: event.responseBody ?? '',
    });
  }
}
