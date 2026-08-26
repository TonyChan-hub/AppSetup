class ZippyProtocol {
  static const int version = 1;
  static const int defaultPort = 9876;
  static const int maxNetworkBodyBytes = 8192;
  static const int maxNetworkEvents = 500;
  static const int maxPerfSamples = 120;
  static const int defaultSqliteRowLimit = 200;
}

class ZippyMessageKind {
  static const String request = 'request';
  static const String response = 'response';
  static const String event = 'event';
}

class ZippyMethod {
  static const String ping = 'ping';
  static const String deviceInfo = 'device.info';
  static const String mmkvListInstances = 'mmkv.listInstances';
  static const String mmkvListKeys = 'mmkv.listKeys';
  static const String mmkvGet = 'mmkv.get';
  static const String sqliteListDatabases = 'sqlite.listDatabases';
  static const String sqliteListTables = 'sqlite.listTables';
  static const String sqliteSchema = 'sqlite.schema';
  static const String sqliteQuery = 'sqlite.query';
  static const String networkList = 'network.list';
  static const String perfLatest = 'perf.latest';
}

class ZippyEventType {
  static const String connected = 'probe.connected';
  static const String deviceInfo = 'device.info';
  static const String networkEvent = 'network.event';
  static const String perfSample = 'perf.sample';
  static const String error = 'probe.error';
}

Map<String, dynamic> zippyRequest(
  String id,
  String method, [
  Map<String, dynamic>? params,
]) {
  return {
    'v': ZippyProtocol.version,
    'kind': ZippyMessageKind.request,
    'id': id,
    'method': method,
    'params': params ?? <String, dynamic>{},
  };
}

Map<String, dynamic> zippyResponse(
  String id, {
  Object? result,
  Map<String, String>? error,
}) {
  return {
    'v': ZippyProtocol.version,
    'kind': ZippyMessageKind.response,
    'id': id,
    'result': error == null ? result : null,
    'error': error,
  };
}

Map<String, dynamic> zippyEvent(String type, [Object? payload]) {
  return {
    'v': ZippyProtocol.version,
    'kind': ZippyMessageKind.event,
    'type': type,
    'payload': payload,
    'ts': DateTime.now().millisecondsSinceEpoch,
  };
}

String truncateBody(String? body, [int max = ZippyProtocol.maxNetworkBodyBytes]) {
  if (body == null) {
    return '';
  }
  if (body.length <= max) {
    return body;
  }
  return '${body.substring(0, max)}… [truncated]';
}
