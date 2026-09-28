enum LogLevel {
  debug,
  info,
  warn,
  error;

  String get value => name;
}

enum LogCategory {
  network,
  ui,
  crash,
  template;

  String get value => name;
}

class LogEntry {
  const LogEntry({
    this.id,
    required this.level,
    required this.category,
    required this.message,
    this.extra,
    required this.createdAt,
  });

  final int? id;
  final LogLevel level;
  final LogCategory category;
  final String message;
  final String? extra;
  final int createdAt;

  Map<String, dynamic> toMap() => {
        'level': level.value,
        'category': category.value,
        'message': message,
        'extra': extra,
        'created_at': createdAt,
      };

  factory LogEntry.fromMap(Map<String, dynamic> map) {
    return LogEntry(
      id: map['id'] as int?,
      level: LogLevel.values.firstWhere(
        (e) => e.name == map['level'],
        orElse: () => LogLevel.info,
      ),
      category: LogCategory.values.firstWhere(
        (e) => e.name == map['category'],
        orElse: () => LogCategory.ui,
      ),
      message: map['message'] as String? ?? '',
      extra: map['extra'] as String?,
      createdAt: map['created_at'] as int? ?? 0,
    );
  }
}
