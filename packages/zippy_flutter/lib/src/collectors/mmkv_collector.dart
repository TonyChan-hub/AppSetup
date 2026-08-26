import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class MmkvCollector {
  Future<List<Map<String, dynamic>>> listInstances() async {
    final instances = <Map<String, dynamic>>[];
    final seen = <String>{};

    for (final entry in _registeredStores.entries) {
      seen.add(entry.key);
      instances.add({
        'id': entry.key,
        'path': 'registered://${entry.key}',
        'sizeBytes': 0,
        'source': 'registered',
      });
    }

    final dirs = await _candidateDirs();
    for (final dir in dirs) {
      try {
        if (!await dir.exists()) {
          continue;
        }
        await for (final entity in dir.list(recursive: false, followLinks: false)) {
          if (entity is! File) {
            continue;
          }
          final name = p.basename(entity.path);
          if (name.endsWith('.crc') || name.contains('.')) {
            continue;
          }
          if (!seen.add(name)) {
            continue;
          }
          instances.add({
            'id': name,
            'path': entity.path,
            'sizeBytes': await entity.length(),
            'source': 'file',
          });
        }
      } on PathAccessException {
        // Android denies listing paths outside the app sandbox (e.g. /data/data).
        continue;
      } on FileSystemException {
        continue;
      }
    }

    if (instances.isEmpty) {
      instances.add({
        'id': 'default',
        'path': dirs.isNotEmpty ? dirs.first.path : '',
        'sizeBytes': 0,
        'note': 'No MMKV files found; register stores via ZippyProbe.registerMmkvStore().',
      });
    }

    return instances;
  }

  final Map<String, Map<String, dynamic>> _registeredStores = {};

  void registerStore(String id, Map<String, dynamic> Function() reader) {
    _registeredStores[id] = {'reader': reader};
  }

  Future<List<String>> listKeys(String instanceId) async {
    final store = _registeredStores[instanceId];
    if (store == null) {
      return [];
    }
    final reader = store['reader'] as Map<String, dynamic> Function();
    final data = reader();
    return data.keys.map((key) => key.toString()).toList()..sort();
  }

  Future<Map<String, dynamic>?> getValue(String instanceId, String key) async {
    final store = _registeredStores[instanceId];
    if (store == null) {
      return null;
    }
    final reader = store['reader'] as Map<String, dynamic> Function();
    final data = reader();
    if (!data.containsKey(key)) {
      return null;
    }
    final value = data[key];
    return {
      'key': key,
      'type': _valueType(value),
      'value': _serializeValue(value),
    };
  }

  String _valueType(Object? value) {
    if (value == null) {
      return 'null';
    }
    if (value is String) {
      return 'string';
    }
    if (value is bool) {
      return 'bool';
    }
    if (value is int) {
      return 'int';
    }
    if (value is double) {
      return 'double';
    }
    if (value is List<int>) {
      return 'bytes';
    }
    return value.runtimeType.toString();
  }

  String _serializeValue(Object? value) {
    if (value == null) {
      return '';
    }
    if (value is List<int>) {
      final preview = value.take(64).toList();
      return base64Encode(preview) + (value.length > 64 ? '…' : '');
    }
    if (value is Map || value is List) {
      return jsonEncode(value);
    }
    return value.toString();
  }

  /// Only scan directories this process can read. Never walk `/data/data`.
  Future<List<Directory>> _candidateDirs() async {
    final dirs = <Directory>[];
    try {
      final docs = await getApplicationDocumentsDirectory();
      dirs.add(docs);
      dirs.add(Directory(p.join(docs.path, 'mmkv')));
      // Flutter Android: …/<package>/app_flutter → sibling files / mmkv
      final packageRoot = Directory(p.normalize(p.join(docs.path, '..')));
      dirs.add(Directory(p.join(packageRoot.path, 'files')));
      dirs.add(Directory(p.join(packageRoot.path, 'files', 'mmkv')));
      dirs.add(Directory(p.join(packageRoot.path, 'mmkv')));
    } catch (_) {}
    return dirs;
  }
}
