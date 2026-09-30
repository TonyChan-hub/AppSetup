import type { DeviceCollector } from './collectors/deviceCollector';
import type { MmkvCollector } from './collectors/mmkvCollector';
import type { NetworkCollector } from './collectors/networkCollector';
import type { PerfCollector } from './collectors/perfCollector';
import type { SqliteCollector } from './collectors/sqliteCollector';
export declare class ProbeServer {
    private readonly deviceCollector;
    private readonly mmkvCollector;
    private readonly sqliteCollector;
    private readonly networkCollector;
    private readonly perfCollector;
    private ws;
    private readonly clients;
    private port;
    constructor(deviceCollector: DeviceCollector, mmkvCollector: MmkvCollector, sqliteCollector: SqliteCollector, networkCollector: NetworkCollector, perfCollector: PerfCollector);
    start(port?: number): Promise<number>;
    stop(): Promise<void>;
    broadcastEvent(type: string, payload: unknown): void;
    private handleMessage;
    private dispatch;
    private handleMethod;
}
