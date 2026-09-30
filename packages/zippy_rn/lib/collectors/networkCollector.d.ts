export type NetworkEventInput = {
    id: string;
    method: string;
    url: string;
    startedAt: number;
    status?: number | null;
    durationMs?: number | null;
    requestHeaders?: Record<string, string> | null;
    responseHeaders?: Record<string, string> | null;
    requestBody?: string | null;
    responseBody?: string | null;
    error?: string | null;
};
export declare class NetworkCollector {
    private readonly events;
    record(event: NetworkEventInput): void;
    list(): Array<Record<string, unknown>>;
}
