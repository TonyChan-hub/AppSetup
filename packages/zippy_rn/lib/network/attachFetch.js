"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachFetch = attachFetch;
function headersToRecord(headers) {
    const out = {};
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
function bodyToString(body) {
    if (body == null) {
        return null;
    }
    if (typeof body === 'string') {
        return body;
    }
    return `[${Object.prototype.toString.call(body)}]`;
}
function record(event) {
    // Lazy require avoids circular import with ZippyProbe.ts
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ZippyProbe } = require('../ZippyProbe');
    ZippyProbe.instance.recordNetworkEvent(event);
}
/**
 * Wrap global fetch (or a custom fetch) to record Zippy network events.
 * No-ops when probe is disabled.
 */
function attachFetch(originalFetch = fetch, options) {
    const enabled = options?.enabled ?? (typeof __DEV__ !== 'undefined' && __DEV__);
    if (!enabled) {
        return originalFetch;
    }
    return async (input, init) => {
        const startedAt = Date.now();
        const method = (init?.method ?? 'GET').toUpperCase();
        let url = '';
        if (typeof input === 'string') {
            url = input;
        }
        else if (typeof URL !== 'undefined' && input instanceof URL) {
            url = input.toString();
        }
        else if (typeof input === 'object' && input && 'url' in input) {
            url = String(input.url);
        }
        try {
            const response = await originalFetch(input, init);
            const clone = response.clone();
            let responseBody = null;
            try {
                responseBody = await clone.text();
            }
            catch {
                responseBody = null;
            }
            record({
                id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
                method,
                url,
                startedAt,
                status: response.status,
                durationMs: Date.now() - startedAt,
                requestHeaders: headersToRecord(init?.headers),
                responseHeaders: headersToRecord(response.headers),
                requestBody: bodyToString(init?.body),
                responseBody,
            });
            return response;
        }
        catch (error) {
            record({
                id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
                method,
                url,
                startedAt,
                durationMs: Date.now() - startedAt,
                requestHeaders: headersToRecord(init?.headers),
                requestBody: bodyToString(init?.body),
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    };
}
