import type { NetworkEventInput } from '../collectors/networkCollector';

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function headersToRecord(
  headers: Headers | Record<string, string> | string[][] | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) {
    return out;
  }
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      out[key] = value;
    }
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      out[key] = value;
    }
  }
  return out;
}

function bodyToString(body: unknown): string | null {
  if (body == null) {
    return null;
  }
  if (typeof body === 'string') {
    return body;
  }
  return `[${Object.prototype.toString.call(body)}]`;
}

function record(event: NetworkEventInput): void {
  // Lazy require avoids circular import with ZippyProbe.ts
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ZippyProbe } = require('../ZippyProbe') as typeof import('../ZippyProbe');
  ZippyProbe.instance.recordNetworkEvent(event);
}

/**
 * Wrap global fetch (or a custom fetch) to record Zippy network events.
 * No-ops when probe is disabled.
 */
export function attachFetch(
  originalFetch: FetchLike = fetch as FetchLike,
  options?: { enabled?: boolean },
): FetchLike {
  const enabled =
    options?.enabled ?? (typeof __DEV__ !== 'undefined' && __DEV__);
  if (!enabled) {
    return originalFetch;
  }

  return async (input, init) => {
    const startedAt = Date.now();
    const method = (init?.method ?? 'GET').toUpperCase();
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (typeof URL !== 'undefined' && input instanceof URL) {
      url = input.toString();
    } else if (typeof input === 'object' && input && 'url' in input) {
      url = String((input as { url: string }).url);
    }

    try {
      const response = await originalFetch(input, init);
      const clone = response.clone();
      let responseBody: string | null = null;
      try {
        responseBody = await clone.text();
      } catch {
        responseBody = null;
      }

      record({
        id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
        method,
        url,
        startedAt,
        status: response.status,
        durationMs: Date.now() - startedAt,
        requestHeaders: headersToRecord(
          init?.headers as
            | Headers
            | Record<string, string>
            | string[][]
            | undefined,
        ),
        responseHeaders: headersToRecord(response.headers),
        requestBody: bodyToString(init?.body),
        responseBody,
      });
      return response;
    } catch (error) {
      record({
        id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
        method,
        url,
        startedAt,
        durationMs: Date.now() - startedAt,
        requestHeaders: headersToRecord(
          init?.headers as
            | Headers
            | Record<string, string>
            | string[][]
            | undefined,
        ),
        requestBody: bodyToString(init?.body),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}
