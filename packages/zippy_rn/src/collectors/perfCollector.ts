import { MAX_PERF_SAMPLES } from '../protocol';

type PerfSample = {
  ts: number;
  fps: number;
  frameTimeMs: number;
  rssBytes: number;
};

export class PerfCollector {
  private readonly samples: PerfSample[] = [];
  private readonly frameDurations: number[] = [];
  private started = false;
  private rafId: number | null = null;
  private lastFrameTs: number | null = null;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.lastFrameTs = null;
    this.loopFrames();
    this.sampleTimer = setInterval(() => this.captureSample(), 1000);
  }

  stop(): void {
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

  private loopFrames(): void {
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

  private captureSample(): void {
    const avgFrameMs =
      this.frameDurations.length === 0
        ? 0
        : this.frameDurations.reduce((a, b) => a + b, 0) /
          this.frameDurations.length;
    const fps = avgFrameMs <= 0 ? 0 : 1000 / avgFrameMs;
    const sample: PerfSample = {
      ts: Date.now(),
      fps: Number(fps.toFixed(1)),
      frameTimeMs: Number(avgFrameMs.toFixed(2)),
      rssBytes: 0,
    };
    this.samples.push(sample);
    while (this.samples.length > MAX_PERF_SAMPLES) {
      this.samples.shift();
    }
  }

  latest(): Record<string, unknown> {
    if (this.samples.length === 0) {
      this.captureSample();
    }
    return {
      latest: this.samples.length === 0 ? null : this.samples[this.samples.length - 1],
      history: [...this.samples],
    };
  }
}
