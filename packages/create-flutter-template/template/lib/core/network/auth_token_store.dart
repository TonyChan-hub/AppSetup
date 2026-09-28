import 'package:shared_preferences/shared_preferences.dart';

import '../../entities/auth/auth_session.dart';

/// Persists auth tokens for reuse across launches.
class AuthTokenStore {
  AuthTokenStore._();

  static const _userIdKey = 'auth_user_id';
  static const _accessTokenKey = 'auth_access_token';
  static const _refreshTokenKey = 'auth_refresh_token';

  static AuthSession? _memorySession;
  static void Function()? onSessionChanged;

  static AuthSession? get session => _memorySession;

  static String? get accessToken => _memorySession?.accessToken;

  static String? get refreshToken => _memorySession?.refreshToken;

  static Future<AuthSession?> load() async {
    if (_memorySession != null) {
      return _memorySession;
    }

    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString(_userIdKey);
    final accessToken = prefs.getString(_accessTokenKey);
    final refreshToken = prefs.getString(_refreshTokenKey);
    if (userId == null || accessToken == null || refreshToken == null) {
      return null;
    }

    final session = AuthSession(
      userId: userId,
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
    if (!session.isValid) {
      return null;
    }

    _memorySession = session;
    return session;
  }

  static Future<void> save(AuthSession session) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userIdKey, session.userId);
    await prefs.setString(_accessTokenKey, session.accessToken);
    await prefs.setString(_refreshTokenKey, session.refreshToken);
    _memorySession = session;
    onSessionChanged?.call();
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userIdKey);
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_refreshTokenKey);
    _memorySession = null;
    onSessionChanged?.call();
  }
}
