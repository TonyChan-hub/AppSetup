import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import '../constants/app_constants.dart';
import 'log_entry.dart';

/// Local sqflite logger — writes in debug / when [enabled] is true.
class LocalLogger {
  LocalLogger._();
  static final LocalLogger instance = LocalLogger._();

  Database? _db;
  bool enabled = kDebugMode;

  Future<Database> get _database async {
    if (_db != null) return _db!;
    final dir = await getApplicationDocumentsDirectory();
    final path = p.join(dir.path, 'app_logs.db');
    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL,
            category TEXT NOT NULL,
            message TEXT NOT NULL,
            extra TEXT,
            created_at INTEGER NOT NULL
          )
        ''');
        await db.execute(
          'CREATE INDEX idx_logs_created ON logs(created_at DESC)',
        );
      },
    );
    return _db!;
  }

  Future<void> log({
    required LogLevel level,
    required LogCategory category,
    required String message,
    Map<String, dynamic>? extra,
  }) async {
    if (!enabled && level != LogLevel.error) return;
    try {
      final db = await _database;
      await db.insert('logs', {
        'level': level.value,
        'category': category.value,
        'message': message,
        'extra': extra == null ? null : jsonEncode(extra),
        'created_at': DateTime.now().millisecondsSinceEpoch,
      });
      await _trim(db);
    } catch (_) {
      // Never throw from logger.
    }
  }

  Future<void> debug(LogCategory c, String msg, [Map<String, dynamic>? e]) =>
      log(level: LogLevel.debug, category: c, message: msg, extra: e);

  Future<void> info(LogCategory c, String msg, [Map<String, dynamic>? e]) =>
      log(level: LogLevel.info, category: c, message: msg, extra: e);

  Future<void> warn(LogCategory c, String msg, [Map<String, dynamic>? e]) =>
      log(level: LogLevel.warn, category: c, message: msg, extra: e);

  Future<void> error(LogCategory c, String msg, [Map<String, dynamic>? e]) =>
      log(level: LogLevel.error, category: c, message: msg, extra: e);

  Future<void> _trim(Database db) async {
    final count = Sqflite.firstIntValue(
          await db.rawQuery('SELECT COUNT(*) FROM logs'),
        ) ??
        0;
    if (count <= AppConstants.maxLogEntries) return;
    final overflow = count - AppConstants.maxLogEntries;
    await db.rawDelete(
      'DELETE FROM logs WHERE id IN (SELECT id FROM logs ORDER BY created_at ASC LIMIT ?)',
      [overflow],
    );
  }

  Future<List<LogEntry>> query({
    LogLevel? level,
    LogCategory? category,
    String? keyword,
    int? sinceMs,
    int limit = 500,
  }) async {
    final db = await _database;
    final where = <String>[];
    final args = <Object?>[];
    if (level != null) {
      where.add('level = ?');
      args.add(level.value);
    }
    if (category != null) {
      where.add('category = ?');
      args.add(category.value);
    }
    if (keyword != null && keyword.isNotEmpty) {
      where.add('(message LIKE ? OR extra LIKE ?)');
      args.add('%$keyword%');
      args.add('%$keyword%');
    }
    if (sinceMs != null) {
      where.add('created_at >= ?');
      args.add(sinceMs);
    }
    final rows = await db.query(
      'logs',
      where: where.isEmpty ? null : where.join(' AND '),
      whereArgs: args.isEmpty ? null : args,
      orderBy: 'created_at DESC',
      limit: limit,
    );
    return rows.map(LogEntry.fromMap).toList();
  }

  Future<String> exportJson() async {
    final entries = await query(limit: AppConstants.maxLogEntries);
    return const JsonEncoder.withIndent('  ').convert(
      entries
          .map(
            (e) => {
              'id': e.id,
              'level': e.level.value,
              'category': e.category.value,
              'message': e.message,
              'extra': e.extra,
              'created_at': e.createdAt,
            },
          )
          .toList(),
    );
  }

  Future<String> exportCsv() async {
    final entries = await query(limit: AppConstants.maxLogEntries);
    final buf = StringBuffer('id,level,category,message,extra,created_at\n');
    for (final e in entries) {
      String esc(String? s) {
        final v = (s ?? '').replaceAll('"', '""');
        return '"$v"';
      }

      buf.writeln(
        '${e.id},${e.level.value},${e.category.value},${esc(e.message)},${esc(e.extra)},${e.createdAt}',
      );
    }
    return buf.toString();
  }

  Future<void> clear() async {
    final db = await _database;
    await db.delete('logs');
  }
}
