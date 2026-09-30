import { MAX_NETWORK_EVENTS, truncateBody } from '../protocol';

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

export class NetworkCollector {
  private readonly events: NetworkEventInput[] = [];

  record(event: NetworkEventInput): void {
    this.events.push(event);
    while (this.events.length > MAX_NETWORK_EVENTS) {
      this.events.shift();
    }
  }

  list(): Array<Record<string, unknown>> {
    return [...this.events]
      .reverse()
      .map((event) => ({
        id: event.id,
        method: event.method,
        url: event.url,
        startedAt: event.startedAt,
        status: event.status ?? null,
        durationMs: event.durationMs ?? null,
        requestHeaders: event.requestHeaders ?? null,
        responseHeaders: event.responseHeaders ?? null,
        requestBody: truncateBody(event.requestBody),
        responseBody: truncateBody(event.responseBody),
        error: event.error ?? null,
      }));
  }
}
