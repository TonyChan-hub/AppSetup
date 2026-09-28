import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

/// Android predictive back with the same horizontal slide as iOS.
///
/// Wraps [CupertinoPageTransitionsBuilder] with a predictive-back gesture
/// observer so system back swipes on Android U+ animate like Cupertino routes.
class CupertinoPredictiveBackPageTransitionsBuilder
    extends PageTransitionsBuilder {
  const CupertinoPredictiveBackPageTransitionsBuilder();

  @override
  Duration get transitionDuration =>
      CupertinoRouteTransitionMixin.kTransitionDuration;

  @override
  DelegatedTransitionBuilder? get delegatedTransition =>
      CupertinoPageTransition.delegatedTransition;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return _PredictiveBackGestureDetector(
      route: route,
      builder: (context, _, __) {
        return CupertinoRouteTransitionMixin.buildPageTransitions<T>(
          route,
          context,
          animation,
          secondaryAnimation,
          child,
        );
      },
    );
  }
}

typedef _BackGestureBuilder = Widget Function(
  BuildContext context,
  PredictiveBackEvent? startBackEvent,
  PredictiveBackEvent? currentBackEvent,
);

class _PredictiveBackGestureDetector extends StatefulWidget {
  const _PredictiveBackGestureDetector({
    required this.route,
    required this.builder,
  });

  final PageRoute<dynamic> route;
  final _BackGestureBuilder builder;

  @override
  State<_PredictiveBackGestureDetector> createState() =>
      _PredictiveBackGestureDetectorState();
}

class _PredictiveBackGestureDetectorState
    extends State<_PredictiveBackGestureDetector> with WidgetsBindingObserver {
  PredictiveBackEvent? _startBackEvent;
  PredictiveBackEvent? _currentBackEvent;

  bool get _isEnabled =>
      widget.route.isCurrent && widget.route.popGestureEnabled;

  @override
  bool handleStartBackGesture(PredictiveBackEvent backEvent) {
    final inProgress = !backEvent.isButtonEvent && _isEnabled;
    if (!inProgress) {
      return false;
    }

    widget.route.handleStartBackGesture(progress: 1 - backEvent.progress);
    setState(() {
      _startBackEvent = _currentBackEvent = backEvent;
    });
    return true;
  }

  @override
  void handleUpdateBackGestureProgress(PredictiveBackEvent backEvent) {
    widget.route.handleUpdateBackGestureProgress(
      progress: 1 - backEvent.progress,
    );
    setState(() => _currentBackEvent = backEvent);
  }

  @override
  void handleCancelBackGesture() {
    widget.route.handleCancelBackGesture();
    setState(() => _startBackEvent = _currentBackEvent = null);
  }

  @override
  void handleCommitBackGesture() {
    widget.route.handleCommitBackGesture();
    setState(() => _startBackEvent = _currentBackEvent = null);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.builder(context, _startBackEvent, _currentBackEvent);
  }
}
