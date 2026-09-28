import '../../entities/template/template_item.dart';

/// Sample / mock repository — replace with real datasources.
class TemplateRepository {
  Future<List<TemplateItem>> listItems() async {
    return [
      TemplateItem(
        id: 'welcome',
        title: 'Welcome to Flutter Template',
        description: 'This is sample data for business feature development.',
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ),
    ];
  }
}
