"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkCollector = void 0;
const protocol_1 = require("../protocol");
class NetworkCollector {
    constructor() {
        this.events = [];
    }
    record(event) {
        this.events.push(event);
        while (this.events.length > protocol_1.MAX_NETWORK_EVENTS) {
            this.events.shift();
        }
    }
    list() {
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
            requestBody: (0, protocol_1.truncateBody)(event.requestBody),
            responseBody: (0, protocol_1.truncateBody)(event.responseBody),
            error: event.error ?? null,
        }));
    }
}
exports.NetworkCollector = NetworkCollector;
