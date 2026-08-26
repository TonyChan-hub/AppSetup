import 'dart:convert';
import 'dart:io';

import '../collectors/network_collector.dart';

class ZippyHttpResult {
  const ZippyHttpResult({
    required this.statusCode,
    required this.body,
    required this.headers,
  });

  final int statusCode;
  final String body;
  final Map<String, String> headers;
}

class ZippyHttpClient {
  ZippyHttpClient({
    required this.onRecorded,
    HttpClient? inner,
  }) : _inner = inner ?? HttpClient();

  final void Function(NetworkEvent event) onRecorded;
  final HttpClient _inner;

  Future<ZippyHttpResult> get(Uri url) {
    return openUrl('GET', url);
  }

  Future<ZippyHttpResult> openUrl(String method, Uri url) async {
    final startedAt = DateTime.now().millisecondsSinceEpoch;
    final eventId = startedAt.toString();

    try {
      final request = await _inner.openUrl(method, url);
      final response = await request.close();
      final bodyBytes = await response.fold<List<int>>(<int>[], (previous, element) {
        return previous..addAll(element);
      });

      final result = ZippyHttpResult(
        statusCode: response.statusCode,
        body: utf8.decode(bodyBytes, allowMalformed: true),
        headers: _headersMap(response.headers),
      );

      onRecorded(
        NetworkEvent(
          id: eventId,
          method: method,
          url: url.toString(),
          startedAt: startedAt,
          status: response.statusCode,
          durationMs: DateTime.now().millisecondsSinceEpoch - startedAt,
          requestHeaders: _headersMap(request.headers),
          responseHeaders: result.headers,
          responseBody: result.body,
        ),
      );

      return result;
    } catch (error) {
      onRecorded(
        NetworkEvent(
          id: eventId,
          method: method,
          url: url.toString(),
          startedAt: startedAt,
          durationMs: DateTime.now().millisecondsSinceEpoch - startedAt,
          error: error.toString(),
        ),
      );
      rethrow;
    }
  }

  void close({bool force = false}) {
    _inner.close(force: force);
  }

  Map<String, String> _headersMap(HttpHeaders headers) {
    final map = <String, String>{};
    headers.forEach((name, values) {
      map[name] = values.join(', ');
    });
    return map;
  }
}
