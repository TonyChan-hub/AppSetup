import 'package:flutter/foundation.dart';

import '../datasources/local/local_database.dart';
import '../entities/template/template_item.dart';
import '../repositories/template/template_repository.dart';

class TemplateProvider extends ChangeNotifier {
  TemplateProvider({TemplateRepository? repository})
      : _repository = repository ?? TemplateRepository();

  final TemplateRepository _repository;

  List<TemplateItem> items = const [];
  int count = 0;
  bool loading = false;

  static const _countKey = 'template_count';

  Future<void> hydrate() async {
    final raw = await LocalDatabase.instance.getKv(_countKey);
    count = int.tryParse(raw ?? '') ?? 0;
    notifyListeners();
  }

  Future<void> loadItems() async {
    loading = true;
    notifyListeners();
    try {
      items = await _repository.listItems();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> increment() async {
    count += 1;
    await LocalDatabase.instance.setKv(_countKey, '$count');
    notifyListeners();
  }
}
