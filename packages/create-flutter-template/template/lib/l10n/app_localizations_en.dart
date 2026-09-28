// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Flutter Template';

  @override
  String get homeTitle => 'Flutter Template';

  @override
  String get homeSubtitle => 'Start your business features here.';

  @override
  String counterLabel(int count) {
    return 'Counter: $count';
  }

  @override
  String get increment => 'Increment';

  @override
  String get openLogs => 'Open logs';

  @override
  String get localLogs => 'Local logs';

  @override
  String get keywordHint => 'Keyword';

  @override
  String get level => 'Level';

  @override
  String get category => 'Category';

  @override
  String get all => 'All';

  @override
  String get noLogs => 'No logs yet';

  @override
  String get exportJson => 'Export JSON';

  @override
  String get exportCsv => 'Export CSV';

  @override
  String get clear => 'Clear';

  @override
  String get shareLogsText => 'App logs';

  @override
  String get openLogsPromptTitle => 'Open logs?';

  @override
  String get openLogsPromptMessage => 'Open the local debug logs screen?';

  @override
  String get openLogsCancel => 'Cancel';

  @override
  String get openLogsConfirm => 'Open';
}
