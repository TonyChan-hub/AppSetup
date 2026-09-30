"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerfCollector = void 0;
const protocol_1 = require("../protocol");
class PerfCollector {
    constructor() {
        this.samples = [];
        this.frameDurations = [];
        this.started = false;
        this.rafId = null;
        this.lastFrameTs = null;
        this.sampleTimer = null;
    }
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.lastFrameTs = null;
        this.loopFrames();
        this.sampleTimer = setInterval(() => this.captureSample(), 1000);
    }
    stop() {
        if (!this.started) {
            return;
        }
        this.started = false;
        if (this.rafId != null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this.rafId);
        }
        this.rafId = null;
        if (this.sampleTimer) {
            clearInterval(this.sampleTimer);
            this.sampleTimer = null;
        }
    }
    loopFrames() {
        if (!this.started || typeof requestAnimationFrame !== 'function') {
            return;
        }
        this.rafId = requestAnimationFrame((ts) => {
            if (this.lastFrameTs != null) {
                const delta = ts - this.lastFrameTs;
                this.frameDurations.push(delta);
                while (this.frameDurations.length > 120) {
                    this.frameDurations.shift();
                }
            }
            this.lastFrameTs = ts;
            this.loopFrames();
        });
    }
    captureSample() {
        const avgFrameMs = this.frameDurations.length === 0
            ? 0
            : this.frameDurations.reduce((a, b) => a + b, 0) /
                this.frameDurations.length;
        const fps = avgFrameMs <= 0 ? 0 : 1000 / avgFrameMs;
        const sample = {
            ts: Date.now(),
            fps: Number(fps.toFixed(1)),
            frameTimeMs: Number(avgFrameMs.toFixed(2)),
            rssBytes: 0,
        };
        this.samples.push(sample);
        while (this.samples.length > protocol_1.MAX_PERF_SAMPLES) {
            this.samples.shift();
        }
    }
    latest() {
        if (this.samples.length === 0) {
            this.captureSample();
        }
        return {
            latest: this.samples.length === 0 ? null : this.samples[this.samples.length - 1],
            history: [...this.samples],
        };
    }
}
exports.PerfCollector = PerfCollector;
