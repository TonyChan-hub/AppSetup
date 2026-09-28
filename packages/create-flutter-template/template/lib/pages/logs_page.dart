import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:flutter_template_app/l10n/app_localizations.dart';
import 'package:flutter_template_app/core/logging/local_logger.dart';
import 'package:flutter_template_app/core/logging/log_entry.dart';

class LogsPage extends StatefulWidget {
  const LogsPage({super.key});

  @override
  State<LogsPage> createState() => _LogsPageState();
}

class _LogsPageState extends State<LogsPage> {
  LogLevel? _level;
  LogCategory? _category;
  final _keyword = TextEditingController();
  Future<List<LogEntry>>? _future;

  @override
  void initState() {
    super.initState();
    LocalLogger.instance.enabled = true;
    _reload();
  }

  @override
  void dispose() {
    _keyword.dispose();
    super.dispose();
  }

  void _reload() {
    setState(() {
      _future = LocalLogger.instance.query(
        level: _level,
        category: _category,
        keyword: _keyword.text.trim().isEmpty ? null : _keyword.text.trim(),
      );
    });
  }

  Future<void> _export(bool csv, String shareText) async {
    final content = csv
        ? await LocalLogger.instance.exportCsv()
        : await LocalLogger.instance.exportJson();
    final dir = await getTemporaryDirectory();
    final file = File(
      '${dir.path}/app_logs_${DateTime.now().millisecondsSinceEpoch}.${csv ? 'csv' : 'json'}',
    );
    await file.writeAsString(content);
    await Share.shareXFiles([XFile(file.path)], text: shareText);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.localLogs),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) async {
              if (v == 'json') await _export(false, l10n.shareLogsText);
              if (v == 'csv') await _export(true, l10n.shareLogsText);
              if (v == 'clear') {
                await LocalLogger.instance.clear();
                _reload();
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(value: 'json', child: Text(l10n.exportJson)),
              PopupMenuItem(value: 'csv', child: Text(l10n.exportCsv)),
              PopupMenuItem(value: 'clear', child: Text(l10n.clear)),
            ],
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  TextField(
                    controller: _keyword,
                    decoration: InputDecoration(
                      hintText: l10n.keywordHint,
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.search),
                        onPressed: _reload,
                      ),
                      border: const OutlineInputBorder(),
                      isDense: true,
                    ),
                    onSubmitted: (_) => _reload(),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<LogLevel?>(
                          initialValue: _level,
                          decoration: InputDecoration(
                            labelText: l10n.level,
                            isDense: true,
                            border: const OutlineInputBorder(),
                          ),
                          items: [
                            DropdownMenuItem(
                              value: null,
                              child: Text(l10n.all),
                            ),
                            ...LogLevel.values.map(
                              (e) => DropdownMenuItem(
                                value: e,
                                child: Text(e.name),
                              ),
                            ),
                          ],
                          onChanged: (v) {
                            _level = v;
                            _reload();
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<LogCategory?>(
                          initialValue: _category,
                          decoration: InputDecoration(
                            labelText: l10n.category,
                            isDense: true,
                            border: const OutlineInputBorder(),
                          ),
                          items: [
                            DropdownMenuItem(
                              value: null,
                              child: Text(l10n.all),
                            ),
                            ...LogCategory.values.map(
                              (e) => DropdownMenuItem(
                                value: e,
                                child: Text(e.name),
                              ),
                            ),
                          ],
                          onChanged: (v) {
                            _category = v;
                            _reload();
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: FutureBuilder<List<LogEntry>>(
                future: _future,
                builder: (context, snap) {
                  if (snap.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final items = snap.data ?? const [];
                  if (items.isEmpty) {
                    return Center(child: Text(l10n.noLogs));
                  }
                  return ListView.builder(
                    itemCount: items.length,
                    itemBuilder: (context, i) {
                      final e = items[i];
                      final time = DateTime.fromMillisecondsSinceEpoch(
                        e.createdAt,
                      );
                      return ListTile(
                        dense: true,
                        title: Text('[${e.level.name}] ${e.message}'),
                        subtitle: Text(
                          '${e.category.name} · $time${e.extra == null ? '' : '\n${e.extra}'}',
                        ),
                        isThreeLine: e.extra != null,
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
