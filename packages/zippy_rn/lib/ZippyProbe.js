"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZippyProbe = void 0;
const deviceCollector_1 = require("./collectors/deviceCollector");
const mmkvCollector_1 = require("./collectors/mmkvCollector");
const networkCollector_1 = require("./collectors/networkCollector");
const perfCollector_1 = require("./collectors/perfCollector");
const sqliteCollector_1 = require("./collectors/sqliteCollector");
const attachFetch_1 = require("./network/attachFetch");
const protocol_1 = require("./protocol");
const probeServer_1 = require("./probeServer");
const deviceCollector = new deviceCollector_1.DeviceCollector();
const mmkvCollector = new mmkvCollector_1.MmkvCollector();
const sqliteCollector = new sqliteCollector_1.SqliteCollector();
const networkCollector = new networkCollector_1.NetworkCollector();
const perfCollector = new perfCollector_1.PerfCollector();
class ZippyProbe {
    constructor() {
        this.server = null;
        this.port = null;
        this.perfTimer = null;
    }
    static get isEnabled() {
        return typeof __DEV__ !== 'undefined' && __DEV__;
    }
    static get device() {
        return deviceCollector;
    }
    static get mmkv() {
        return mmkvCollector;
    }
    static get sqlite() {
        return sqliteCollector;
    }
    static get network() {
        return networkCollector;
    }
    static get perf() {
        return perfCollector;
    }
    get isRunning() {
        return this.server != null;
    }
    getPort() {
        return this.port;
    }
    static registerMmkvStore(id, reader) {
        mmkvCollector.registerStore(id, reader);
    }
    static registerSqliteDatabase(id, nameOrPath) {
        sqliteCollector.registerDatabase(id, nameOrPath);
    }
    static async start(options = {}) {
        const shouldRun = options.enabled ?? ZippyProbe.isEnabled;
        if (!shouldRun) {
            return null;
        }
        if (options.appInfo) {
            deviceCollector.configure(options.appInfo);
        }
        return ZippyProbe.instance._start(options.port ?? protocol_1.DEFAULT_PROBE_PORT);
    }
    static async stop() {
        return ZippyProbe.instance._stop();
    }
    async _start(port) {
        if (this.server) {
            return this.port ?? port;
        }
        this.server = new probeServer_1.ProbeServer(deviceCollector, mmkvCollector, sqliteCollector, networkCollector, perfCollector);
        this.port = await this.server.start(port);
        this.server.broadcastEvent(protocol_1.EventType.DEVICE_INFO, await deviceCollector.collect());
        this.perfTimer = setInterval(() => {
            this.server?.broadcastEvent(protocol_1.EventType.PERF_SAMPLE, perfCollector.latest());
        }, 1000);
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            // eslint-disable-next-line no-console
            console.log(`[ZippyProbe] listening on 0.0.0.0:${this.port}/probe`);
        }
        return this.port;
    }
    async _stop() {
        if (this.perfTimer) {
            clearInterval(this.perfTimer);
            this.perfTimer = null;
        }
        await this.server?.stop();
        this.server = null;
        this.port = null;
    }
    recordNetworkEvent(event) {
        networkCollector.record(event);
        this.server?.broadcastEvent(protocol_1.EventType.NETWORK_EVENT, {
            ...event,
            requestBody: event.requestBody ?? '',
            responseBody: event.responseBody ?? '',
        });
    }
}
exports.ZippyProbe = ZippyProbe;
ZippyProbe.instance = new ZippyProbe();
ZippyProbe.attachFetch = attachFetch_1.attachFetch;
