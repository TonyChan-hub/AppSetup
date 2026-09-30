export type MmkvReader = () => Record<string, unknown>;
export declare class MmkvCollector {
    private readonly registered;
    registerStore(id: string, reader: MmkvReader): void;
    listInstances(): Promise<Array<Record<string, unknown>>>;
    listKeys(instanceId: string): Promise<string[]>;
    getValue(instanceId: string, key: string): Promise<Record<string, unknown> | null>;
}
