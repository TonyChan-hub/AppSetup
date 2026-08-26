import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import '../protocol.dart';

class SqliteCollector {
  Future<List<Map<String, dynamic>>> listDatabases() async {
    final results = <Map<String, dynamic>>[];
    final seen = <String>{};

    for (final entry in _registeredPaths.entries) {
      seen.add(entry.key);
      final file = File(entry.value);
      results.add({
        'id': entry.key,
        'path': entry.value,
        'sizeBytes': await file.exists() ? await file.length() : 0,
        'source': 'registered',
      });
    }

    final files = await _discoverDatabaseFiles();
    for (final file in files) {
      final id = p.basename(file.path);
      if (!seen.add(id)) {
        continue;
      }
      results.add({
        'id': id,
        'path': file.path,
        'sizeBytes': file.lengthSync(),
        'source': 'file',
      });
    }
    return results;
  }

  Future<List<String>> listTables(String databaseId) async {
    final db = await _openById(databaseId);
    try {
      final rows = await db.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      );
      return rows.map((row) => row['name'] as String).toList();
    } finally {
      await db.close();
    }
  }

  Future<List<Map<String, dynamic>>> schema(String databaseId, String table) async {
    final db = await _openById(databaseId);
    try {
      final rows = await db.rawQuery('PRAGMA table_info($table)');
      return rows
          .map(
            (row) => {
              'cid': row['cid'],
              'name': row['name'],
              'type': row['type'],
              'notnull': row['notnull'],
              'dflt_value': row['dflt_value'],
              'pk': row['pk'],
            },
          )
          .toList();
    } finally {
      await db.close();
    }
  }

  Future<Map<String, dynamic>> query(
    String databaseId,
    String table, {
    int limit = ZippyProtocol.defaultSqliteRowLimit,
    int offset = 0,
  }) async {
    final db = await _openById(databaseId);
    try {
      final safeLimit = limit.clamp(1, ZippyProtocol.defaultSqliteRowLimit);
      final rows = await db.query(
        table,
        limit: safeLimit,
        offset: offset,
      );
      return {
        'rows': rows,
        'limit': safeLimit,
        'offset': offset,
        'count': rows.length,
      };
    } finally {
      await db.close();
    }
  }

  final Map<String, String> _registeredPaths = {};

  void registerDatabase(String id, String path) {
    _registeredPaths[id] = path;
  }

  Future<Database> _openById(String databaseId) async {
    final registered = _registeredPaths[databaseId];
    if (registered != null) {
      return openDatabase(registered, readOnly: true);
    }

    final files = await _discoverDatabaseFiles();
    final match = files.where((file) => p.basename(file.path) == databaseId);
    if (match.isEmpty) {
      throw StateError('Database not found: $databaseId');
    }
    return openDatabase(match.first.path, readOnly: true);
  }

  Future<List<File>> _discoverDatabaseFiles() async {
    final files = <File>[];
    final docs = await getApplicationDocumentsDirectory();
    await _scanDir(docs, files);
    final databasesDir = Directory(p.join(docs.path, '../databases'));
    if (await databasesDir.exists()) {
      await _scanDir(databasesDir, files);
    }
    return files;
  }

  Future<void> _scanDir(Directory dir, List<File> files) async {
    try {
      if (!await dir.exists()) {
        return;
      }
      await for (final entity in dir.list(recursive: true, followLinks: false)) {
        if (entity is File && entity.path.endsWith('.db')) {
          files.add(entity);
        }
      }
    } on PathAccessException {
      return;
    } on FileSystemException {
      return;
    }
  }
}
