import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

class DeviceCollector {
  Future<Map<String, dynamic>> collect() async {
    final packageInfo = await PackageInfo.fromPlatform();
    final plugin = DeviceInfoPlugin();
    final platform = <String, dynamic>{
      'debugMode': kDebugMode,
      'dartVersion': Platform.version.split(' ').first,
    };

    if (Platform.isAndroid) {
      final info = await plugin.androidInfo;
      platform.addAll({
        'os': 'android',
        'brand': info.brand,
        'model': info.model,
        'device': info.device,
        'sdkInt': info.version.sdkInt,
        'release': info.version.release,
        'isPhysicalDevice': info.isPhysicalDevice,
      });
    } else if (Platform.isIOS) {
      final info = await plugin.iosInfo;
      platform.addAll({
        'os': 'ios',
        'name': info.name,
        'model': info.model,
        'systemName': info.systemName,
        'systemVersion': info.systemVersion,
        'isPhysicalDevice': info.isPhysicalDevice,
      });
    } else {
      platform['os'] = Platform.operatingSystem;
    }

    return {
      'app': {
        'name': packageInfo.appName,
        'packageName': packageInfo.packageName,
        'version': packageInfo.version,
        'buildNumber': packageInfo.buildNumber,
      },
      'platform': platform,
    };
  }
}
