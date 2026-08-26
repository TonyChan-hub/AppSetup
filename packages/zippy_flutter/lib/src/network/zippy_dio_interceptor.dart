import 'dart:convert';

import 'package:dio/dio.dart';

import '../collectors/network_collector.dart';
import '../zippy_probe.dart';

/// Captures Dio traffic into Zippy Network panel with no per-call business hooks.
class ZippyDioInterceptor extends Interceptor {
  ZippyDioInterceptor({void Function(NetworkEvent event)? onRecorded})
      : _onRecorded = onRecorded ?? ZippyProbe.instance.recordNetworkEvent;

  static const String _startedAtKey = 'zippy.startedAt';

  final void Function(NetworkEvent event) _onRecorded;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.extra[_startedAtKey] = DateTime.now().millisecondsSinceEpoch;
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    _record(
      response.requestOptions,
      status: response.statusCode,
      responseHeaders: _headersFromMap(response.headers.map),
      responseBody: _stringifyData(response.data),
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _record(
      err.requestOptions,
      status: err.response?.statusCode,
      responseHeaders:
          err.response == null ? null : _headersFromMap(err.response!.headers.map),
      responseBody: err.response == null ? null : _stringifyData(err.response!.data),
      error: err.message ?? err.type.name,
    );
    handler.next(err);
  }

  void _record(
    RequestOptions options, {
    int? status,
    Map<String, String>? responseHeaders,
    String? responseBody,
    String? error,
  }) {
    final startedAt =
        options.extra[_startedAtKey] as int? ?? DateTime.now().millisecondsSinceEpoch;
    final now = DateTime.now().millisecondsSinceEpoch;
    _onRecorded(
      NetworkEvent(
        id: '$startedAt-${identityHashCode(options)}',
        method: options.method,
        url: options.uri.toString(),
        startedAt: startedAt,
        status: status,
        durationMs: now - startedAt,
        requestHeaders: _headersFromMap(options.headers),
        responseHeaders: responseHeaders,
        requestBody: _stringifyData(options.data),
        responseBody: responseBody,
        error: error,
      ),
    );
  }

  Map<String, String> _headersFromMap(Map<String, dynamic> raw) {
    final out = <String, String>{};
    raw.forEach((key, value) {
      if (value is List) {
        out[key] = value.map((item) => item.toString()).join(', ');
      } else {
        out[key] = value?.toString() ?? '';
      }
    });
    return out;
  }

  String? _stringifyData(Object? data) {
    if (data == null) {
      return null;
    }
    if (data is FormData) {
      return '[FormData fields=${data.fields.length} files=${data.files.length}]';
    }
    if (data is List<int>) {
      return '[bytes length=${data.length}]';
    }
    if (data is String) {
      return data;
    }
    try {
      return jsonEncode(data);
    } catch (_) {
      return data.toString();
    }
  }
}
