/// App-wide constants.
class AppConstants {
  AppConstants._();

  /// Remote API base URL (override via `--dart-define=API_BASE_URL=...`).
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.example.com/v1',
  );

  static const String guestLoginPath = '/auth/guest-login';
  static const String refreshTokenPath = '/auth/refresh-token';

  /// Design size for ScreenUtil (matches common mobile Figma frames).
  static const double designWidth = 390;
  static const double designHeight = 844;

  static const int maxLogEntries = 5000;
}
