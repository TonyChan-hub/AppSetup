import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:flutter_template_app/l10n/app_localizations.dart';

import 'local_logger.dart';

/// Listens for device shakes and offers to open the local logs page.
///
/// Disabled in release builds — no debug-panel entry on shipped packages.
class ShakeToOpenLogs extends StatefulWidget {
  const ShakeToOpenLogs({
    super.key,
    required this.navigatorKey,
    required this.child,
  });

  final GlobalKey<NavigatorState> navigatorKey;
  final Widget child;

  @override
  State<ShakeToOpenLogs> createState() => _ShakeToOpenLogsState();
}

class _ShakeToOpenLogsState extends State<ShakeToOpenLogs> {
  static const double _shakeThresholdG = 2.7;
  static const int _requiredShakes = 3;
  static const Duration _shakeInterval = Duration(milliseconds: 500);
  static const Duration _shakeWindow = Duration(seconds: 2);
  static const Duration _cooldown = Duration(seconds: 3);

  StreamSubscription<AccelerometerEvent>? _sub;
  int _shakeCount = 0;
  DateTime? _lastShakeAt;
  DateTime? _windowStartedAt;
  DateTime? _cooldownUntil;
  bool _dialogOpen = false;

  @override
  void initState() {
    super.initState();
    if (kReleaseMode) return;
    _sub = accelerometerEventStream().listen(_onAccelerometer);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  void _onAccelerometer(AccelerometerEvent event) {
    if (_dialogOpen) return;

    final now = DateTime.now();
    if (_cooldownUntil != null && now.isBefore(_cooldownUntil!)) return;

    final gX = event.x / 9.80665;
    final gY = event.y / 9.80665;
    final gZ = event.z / 9.80665;
    final gForce = math.sqrt(gX * gX + gY * gY + gZ * gZ);

    if (gForce < _shakeThresholdG) return;

    if (_lastShakeAt != null &&
        now.difference(_lastShakeAt!) < _shakeInterval) {
      return;
    }

    if (_windowStartedAt == null ||
        now.difference(_windowStartedAt!) > _shakeWindow) {
      _windowStartedAt = now;
      _shakeCount = 0;
    }

    _lastShakeAt = now;
    _shakeCount++;

    if (_shakeCount >= _requiredShakes) {
      _shakeCount = 0;
      _windowStartedAt = null;
      _cooldownUntil = now.add(_cooldown);
      _promptOpenLogs();
    }
  }

  Future<void> _promptOpenLogs() async {
    final navContext = widget.navigatorKey.currentContext;
    if (navContext == null || !navContext.mounted || _dialogOpen) return;

    final location = GoRouter.of(navContext).state.uri.path;
    if (location == '/logs') return;

    final l10n = AppLocalizations.of(navContext);
    if (l10n == null) return;

    _dialogOpen = true;
    try {
      final open = await showDialog<bool>(
        context: navContext,
        builder: (ctx) => AlertDialog(
          title: Text(l10n.openLogsPromptTitle),
          content: Text(l10n.openLogsPromptMessage),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(l10n.openLogsCancel),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: Text(l10n.openLogsConfirm),
            ),
          ],
        ),
      );

      if (open == true && navContext.mounted) {
        LocalLogger.instance.enabled = true;
        navContext.push('/logs');
      }
    } finally {
      _dialogOpen = false;
      _cooldownUntil = DateTime.now().add(_cooldown);
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
