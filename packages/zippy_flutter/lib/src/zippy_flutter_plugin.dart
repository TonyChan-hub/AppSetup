import 'package:flutter/services.dart';

class ZippyFlutterPlugin {
  static const MethodChannel _channel = MethodChannel('zippy_flutter');

  static Future<String?> get platformVersion async {
    return _channel.invokeMethod<String>('getPlatformVersion');
  }
}
