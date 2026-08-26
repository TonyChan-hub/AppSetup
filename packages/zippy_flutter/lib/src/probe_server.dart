import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_web_socket/shelf_web_socket.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'collectors/device_collector.dart';
import 'collectors/mmkv_collector.dart';
import 'collectors/network_collector.dart';
import 'collectors/perf_collector.dart';
import 'collectors/sqlite_collector.dart';
import 'protocol.dart';

typedef ProbeEventCallback = void Function(Map<String, dynamic> event);

class ProbeServer {
  ProbeServer({
    required this.deviceCollector,
    required this.mmkvCollector,
    required this.sqliteCollector,
    required this.networkCollector,
    required this.perfCollector,
    this.onEvent,
  });

  final DeviceCollector deviceCollector;
  final MmkvCollector mmkvCollector;
  final SqliteCollector sqliteCollector;
  final NetworkCollector networkCollector;
  final PerfCollector perfCollector;
  final ProbeEventCallback? onEvent;

  HttpServer? _server;
  final Set<WebSocketChannel> _clients = {};

  Future<int> start({int port = ZippyProtocol.defaultPort}) async {
    if (_server != null) {
      return _server!.port;
    }

    final handler = Pipeline()
        .addMiddleware(logRequests())
        .addHandler(
          (Request request) {
            if (request.url.path == 'probe') {
              return webSocketHandler(_handleSocket)(request);
            }
            return Response.notFound('Not found');
          },
        );

    _server = await shelf_io.serve(handler, InternetAddress.anyIPv4, port);
    perfCollector.start();
    return _server!.port;
  }

  Future<void> stop() async {
    perfCollector.stop();
    for (final client in _clients.toList()) {
      await client.sink.close();
    }
    _clients.clear();
    await _server?.close(force: true);
    _server = null;
  }

  void broadcastEvent(String type, Object? payload) {
    final event = zippyEvent(type, payload);
    onEvent?.call(event);
    final encoded = jsonEncode(event);
    for (final client in _clients.toList()) {
      try {
        client.sink.add(encoded);
      } catch (_) {
        _clients.remove(client);
      }
    }
  }

  void _handleSocket(WebSocketChannel channel) {
    _clients.add(channel);
    broadcastEvent(ZippyEventType.connected, {'clientCount': _clients.length});

    channel.stream.listen(
      (message) async {
        if (message is! String) {
          return;
        }
        try {
          final decoded = jsonDecode(message) as Map<String, dynamic>;
          final response = await _dispatch(decoded);
          if (response != null) {
            channel.sink.add(jsonEncode(response));
          }
        } catch (error) {
          channel.sink.add(
            jsonEncode(
              zippyResponse(
                'unknown',
                error: {
                  'code': 'bad_request',
                  'message': error.toString(),
                },
              ),
            ),
          );
        }
      },
      onDone: () => _clients.remove(channel),
      onError: (_, __) => _clients.remove(channel),
    );
  }

  Future<Map<String, dynamic>?> _dispatch(Map<String, dynamic> message) async {
    if (message['kind'] != ZippyMessageKind.request) {
      return null;
    }

    final id = message['id'] as String? ?? 'unknown';
    final method = message['method'] as String? ?? '';
    final params = (message['params'] as Map?)?.cast<String, dynamic>() ?? {};

    try {
      final result = await _handleMethod(method, params);
      return zippyResponse(id, result: result);
    } catch (error) {
      return zippyResponse(
        id,
        error: {
          'code': 'probe_error',
          'message': error.toString(),
        },
      );
    }
  }

  Future<Object?> _handleMethod(String method, Map<String, dynamic> params) async {
    switch (method) {
      case ZippyMethod.ping:
        return {'ok': true, 'ts': DateTime.now().millisecondsSinceEpoch};
      case ZippyMethod.deviceInfo:
        return deviceCollector.collect();
      case ZippyMethod.mmkvListInstances:
        return {'instances': await mmkvCollector.listInstances()};
      case ZippyMethod.mmkvListKeys:
        return {
          'keys': await mmkvCollector.listKeys(params['instanceId'] as String? ?? 'default'),
        };
      case ZippyMethod.mmkvGet:
        return {
          'entry': await mmkvCollector.getValue(
            params['instanceId'] as String? ?? 'default',
            params['key'] as String? ?? '',
          ),
        };
      case ZippyMethod.sqliteListDatabases:
        return {'databases': await sqliteCollector.listDatabases()};
      case ZippyMethod.sqliteListTables:
        return {
          'tables': await sqliteCollector.listTables(params['databaseId'] as String),
        };
      case ZippyMethod.sqliteSchema:
        return {
          'columns': await sqliteCollector.schema(
            params['databaseId'] as String,
            params['table'] as String,
          ),
        };
      case ZippyMethod.sqliteQuery:
        return sqliteCollector.query(
          params['databaseId'] as String,
          params['table'] as String,
          limit: params['limit'] as int? ?? ZippyProtocol.defaultSqliteRowLimit,
          offset: params['offset'] as int? ?? 0,
        );
      case ZippyMethod.networkList:
        return {'events': networkCollector.list()};
      case ZippyMethod.perfLatest:
        return perfCollector.latest();
      default:
        throw UnsupportedError('Unknown method: $method');
    }
  }
}
