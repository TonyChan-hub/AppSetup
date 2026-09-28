import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

/// Generates and caches a stable guest device ID (prefs + random UUID).
class DeviceIdentityService {
  DeviceIdentityService._();

  static const _clientIdKey = 'clientId';

  static String? _memoryClientId;

  static Future<String> init() async {
    if (_memoryClientId != null) {
      return _memoryClientId!;
    }

    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_clientIdKey);
    if (cached != null && cached.isNotEmpty) {
      _memoryClientId = cached;
      return cached;
    }

    final next = _createRandomClientId();
    await prefs.setString(_clientIdKey, next);
    _memoryClientId = next;
    return next;
  }

  static String get clientId {
    final cached = _memoryClientId;
    if (cached != null) {
      return cached;
    }
    throw StateError('DeviceIdentityService.init() must complete first');
  }

  static String _createRandomClientId() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32),
    ].join('-');
  }
}
