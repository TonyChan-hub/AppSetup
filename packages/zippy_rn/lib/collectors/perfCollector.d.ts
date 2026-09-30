export declare class PerfCollector {
    private readonly samples;
    private readonly frameDurations;
    private started;
    private rafId;
    private lastFrameTs;
    private sampleTimer;
    start(): void;
    stop(): void;
    private loopFrames;
    private captureSample;
    latest(): Record<string, unknown>;
}
