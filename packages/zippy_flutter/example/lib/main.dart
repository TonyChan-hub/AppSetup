import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:zippy_flutter/zippy_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _seedDemoData();
  final port = await ZippyProbe.start();
  runApp(ZippyExampleApp(probePort: port));
}

Future<void> _seedDemoData() async {
  final docs = await getApplicationDocumentsDirectory();
  final dbPath = p.join(docs.path, 'demo.db');
  final db = await openDatabase(dbPath, version: 1, onCreate: (database, version) async {
    await database.execute('''
      CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT,
        updated_at INTEGER NOT NULL
      )
    ''');
    await database.insert('notes', {
      'title': 'Welcome',
      'body': 'Zippy can inspect this SQLite database.',
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    });
  });

  ZippyProbe.registerSqliteDatabase('demo.db', dbPath);
  ZippyProbe.registerMmkvStore('session', () => {
        'token': 'demo-token',
        'theme': 'dark',
        'launchCount': 1,
      });

  await db.close();
}

class ZippyExampleApp extends StatefulWidget {
  const ZippyExampleApp({super.key, this.probePort});

  final int? probePort;

  @override
  State<ZippyExampleApp> createState() => _ZippyExampleAppState();
}

class _ZippyExampleAppState extends State<ZippyExampleApp> {
  String _status = 'Probe idle';

  Future<void> _sendSampleRequest() async {
    setState(() => _status = 'Sending sample request…');
    try {
      final client = ZippyProbe.createHttpClient();
      final result = await client.get(Uri.parse('https://httpbin.org/get?from=zippy'));
      client.close();
      if (!mounted) {
        return;
      }
      setState(() => _status = 'Captured HTTP ${result.statusCode}');
    } catch (error) {
      setState(() => _status = 'Request failed: $error');
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text('Zippy Probe Example')),
        body: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Probe port: ${widget.probePort ?? 'disabled'}'),
              const SizedBox(height: 8),
              Text('Platform: ${Platform.operatingSystem}'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _sendSampleRequest,
                child: const Text('Send sample HTTP request'),
              ),
              const SizedBox(height: 16),
              Text(_status),
            ],
          ),
        ),
      ),
    );
  }
}
