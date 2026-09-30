export type AppInfo = {
    name?: string;
    packageName?: string;
    version?: string;
    buildNumber?: string;
};
export declare class DeviceCollector {
    private appInfo;
    configure(appInfo: AppInfo): void;
    collect(): Promise<Record<string, unknown>>;
}
