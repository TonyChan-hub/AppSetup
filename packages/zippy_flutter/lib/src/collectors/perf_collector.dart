import 'dart:io';

import 'package:flutter/scheduler.dart';

import '../protocol.dart';

class PerfSample {
  PerfSample({
    required this.ts,
    required this.fps,
    required this.frameTimeMs,
    required this.rssBytes,
  });

  final int ts;
  final double fps;
  final double frameTimeMs;
  final int rssBytes;

  Map<String, dynamic> toJson() {
    return {
      'ts': ts,
      'fps': fps,
      'frameTimeMs': frameTimeMs,
      'rssBytes': rssBytes,
    };
  }
}

class PerfCollector {
  PerfCollector();

  final List<PerfSample> _samples = [];
  final List<Duration> _frameDurations = [];
  bool _started = false;

  void start() {
    if (_started) {
      return;
    }
    _started = true;
    SchedulerBinding.instance.addTimingsCallback(_onTimings);
    _sampleTimer();
  }

  void stop() {
    if (!_started) {
      return;
    }
    _started = false;
    SchedulerBinding.instance.removeTimingsCallback(_onTimings);
  }

  void _onTimings(List<FrameTiming> timings) {
    for (final timing in timings) {
      final duration = timing.totalSpan;
      _frameDurations.add(duration);
      while (_frameDurations.length > 120) {
        _frameDurations.removeAt(0);
      }
    }
  }

  void _sampleTimer() {
    if (!_started) {
      return;
    }
    _captureSample();
    Future<void>.delayed(const Duration(seconds: 1), _sampleTimer);
  }

  void _captureSample() {
    final avgFrameMs = _frameDurations.isEmpty
        ? 0.0
        : _frameDurations
                .map((d) => d.inMicroseconds / 1000.0)
                .reduce((a, b) => a + b) /
            _frameDurations.length;
    final fps = avgFrameMs <= 0 ? 0.0 : 1000.0 / avgFrameMs;
    final rss = _readRssBytes();

    final sample = PerfSample(
      ts: DateTime.now().millisecondsSinceEpoch,
      fps: double.parse(fps.toStringAsFixed(1)),
      frameTimeMs: double.parse(avgFrameMs.toStringAsFixed(2)),
      rssBytes: rss,
    );
    _samples.add(sample);
    while (_samples.length > ZippyProtocol.maxPerfSamples) {
      _samples.removeAt(0);
    }
  }

  int _readRssBytes() {
    try {
      return ProcessInfo.currentRss;
    } catch (_) {
      return 0;
    }
  }

  Map<String, dynamic> latest() {
    if (_samples.isEmpty) {
      _captureSample();
    }
    return {
      'latest': _samples.isEmpty ? null : _samples.last.toJson(),
      'history': _samples.map((sample) => sample.toJson()).toList(),
    };
  }
}
