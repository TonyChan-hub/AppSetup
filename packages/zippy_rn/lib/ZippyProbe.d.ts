import { DeviceCollector, type AppInfo } from './collectors/deviceCollector';
import { MmkvCollector, type MmkvReader } from './collectors/mmkvCollector';
import { NetworkCollector, type NetworkEventInput } from './collectors/networkCollector';
import { PerfCollector } from './collectors/perfCollector';
import { SqliteCollector, type SqliteDbFactory } from './collectors/sqliteCollector';
import { attachFetch } from './network/attachFetch';
export type ZippyStartOptions = {
    port?: number;
    enabled?: boolean;
    appInfo?: AppInfo;
};
export declare class ZippyProbe {
    static readonly instance: ZippyProbe;
    private server;
    private port;
    private perfTimer;
    static get isEnabled(): boolean;
    static get device(): DeviceCollector;
    static get mmkv(): MmkvCollector;
    static get sqlite(): SqliteCollector;
    static get network(): NetworkCollector;
    static get perf(): PerfCollector;
    get isRunning(): boolean;
    getPort(): number | null;
    static registerMmkvStore(id: string, reader: MmkvReader): void;
    static registerSqliteDatabase(id: string, nameOrPath: string, openDb?: SqliteDbFactory): void;
    static attachFetch: typeof attachFetch;
    static start(options?: ZippyStartOptions): Promise<number | null>;
    static stop(): Promise<void>;
    private _start;
    private _stop;
    recordNetworkEvent(event: NetworkEventInput): void;
}
