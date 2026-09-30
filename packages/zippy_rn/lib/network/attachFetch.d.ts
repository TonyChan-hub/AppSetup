type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
/**
 * Wrap global fetch (or a custom fetch) to record Zippy network events.
 * No-ops when probe is disabled.
 */
export declare function attachFetch(originalFetch?: FetchLike, options?: {
    enabled?: boolean;
}): FetchLike;
export {};
