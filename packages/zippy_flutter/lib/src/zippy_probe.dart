import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'collectors/device_collector.dart';
import 'collectors/mmkv_collector.dart';
import 'collectors/network_collector.dart';
import 'collectors/perf_collector.dart';
import 'collectors/sqlite_collector.dart';
import 'network/zippy_dio_interceptor.dart';
import 'network/zippy_http_client.dart';
import 'probe_server.dart';
import 'protocol.dart';

class ZippyProbe {
  ZippyProbe._();

  static final ZippyProbe instance = ZippyProbe._();

  static final DeviceCollector _deviceCollector = DeviceCollector();
  static final MmkvCollector _mmkvCollector = MmkvCollector();
  static final SqliteCollector _sqliteCollector = SqliteCollector();
  static final NetworkCollector _networkCollector = NetworkCollector();
  static final PerfCollector _perfCollector = PerfCollector();

  ProbeServer? _server;
  int? _port;

  static DeviceCollector get deviceCollector => _deviceCollector;
  static MmkvCollector get mmkvCollector => _mmkvCollector;
  static SqliteCollector get sqliteCollector => _sqliteCollector;
  static NetworkCollector get networkCollector => _networkCollector;
  static PerfCollector get perfCollector => _perfCollector;

  static bool get isEnabled =>
      kDebugMode || const bool.fromEnvironment('ZIPPY_PROBE', defaultValue: false);

  int? get port => _port;
  bool get isRunning => _server != null;

  static void registerMmkvStore(String id, Map<String, dynamic> Function() reader) {
    _mmkvCollector.registerStore(id, reader);
  }

  static void registerSqliteDatabase(String id, String path) {
    _sqliteCollector.registerDatabase(id, path);
  }

  static ZippyHttpClient createHttpClient() {
    return ZippyHttpClient(onRecorded: instance.recordNetworkEvent);
  }

  /// One-line Dio hookup for apps that already use a shared [Dio] client.
  /// No-ops when probe is disabled. Safe to call more than once on the same instance.
  static void attachDio(Dio dio, {bool? enabled}) {
    final shouldAttach = enabled ?? isEnabled;
    if (!shouldAttach) {
      return;
    }
    final alreadyAttached = dio.interceptors.any((interceptor) => interceptor is ZippyDioInterceptor);
    if (alreadyAttached) {
      return;
    }
    dio.interceptors.add(ZippyDioInterceptor());
  }

  static Future<int?> start({int port = ZippyProtocol.defaultPort, bool? enabled}) async {
    final shouldRun = enabled ?? isEnabled;
    if (!shouldRun) {
      return null;
    }
    return instance._start(port);
  }

  static Future<void> stop() => instance._stop();

  Future<int> _start(int port) async {
    if (_server != null) {
      return _port ?? port;
    }

    _server = ProbeServer(
      deviceCollector: _deviceCollector,
      mmkvCollector: _mmkvCollector,
      sqliteCollector: _sqliteCollector,
      networkCollector: _networkCollector,
      perfCollector: _perfCollector,
      onEvent: _handleEvent,
    );

    _port = await _server!.start(port: port);
    _server!.broadcastEvent(ZippyEventType.deviceInfo, await _deviceCollector.collect());
    _startPerfBroadcast();
    return _port!;
  }

  Timer? _perfTimer;

  void _startPerfBroadcast() {
    _perfTimer?.cancel();
    _perfTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      broadcastPerfSample();
    });
  }

  Future<void> _stop() async {
    _perfTimer?.cancel();
    _perfTimer = null;
    await _server?.stop();
    _server = null;
    _port = null;
  }

  void _handleEvent(Map<String, dynamic> event) {
    if (event['type'] == ZippyEventType.perfSample) {
      return;
    }
    if (kDebugMode) {
      // ignore: avoid_print
      print('[ZippyProbe] ${jsonEncode(event)}');
    }
  }

  void recordNetworkEvent(NetworkEvent event) {
    _networkCollector.record(event);
    _server?.broadcastEvent(ZippyEventType.networkEvent, event.toJson());
  }

  void broadcastPerfSample() {
    _server?.broadcastEvent(ZippyEventType.perfSample, _perfCollector.latest());
  }
}
