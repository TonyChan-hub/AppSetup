import '../protocol.dart';

class NetworkEvent {
  NetworkEvent({
    required this.id,
    required this.method,
    required this.url,
    required this.startedAt,
    this.status,
    this.durationMs,
    this.requestHeaders,
    this.responseHeaders,
    this.requestBody,
    this.responseBody,
    this.error,
  });

  final String id;
  final String method;
  final String url;
  final int startedAt;
  final int? status;
  final int? durationMs;
  final Map<String, String>? requestHeaders;
  final Map<String, String>? responseHeaders;
  final String? requestBody;
  final String? responseBody;
  final String? error;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'method': method,
      'url': url,
      'startedAt': startedAt,
      'status': status,
      'durationMs': durationMs,
      'requestHeaders': requestHeaders,
      'responseHeaders': responseHeaders,
      'requestBody': truncateBody(requestBody),
      'responseBody': truncateBody(responseBody),
      'error': error,
    };
  }
}

class NetworkCollector {
  final List<NetworkEvent> _events = [];

  void record(NetworkEvent event) {
    _events.add(event);
    while (_events.length > ZippyProtocol.maxNetworkEvents) {
      _events.removeAt(0);
    }
  }

  List<Map<String, dynamic>> list() {
    return _events.reversed.map((event) => event.toJson()).toList();
  }
}
