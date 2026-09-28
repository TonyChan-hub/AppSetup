import 'package:permission_handler/permission_handler.dart';

enum CameraPermissionResult {
  granted,
  denied,
  permanentlyDenied,
}

/// System camera permission via [permission_handler] only (no custom rationale UI).
class CameraPermission {
  CameraPermission._();

  static Future<CameraPermissionResult> ensureCameraPermission() async {
    final status = await Permission.camera.status;
    if (status.isGranted) {
      return CameraPermissionResult.granted;
    }

    if (status.isPermanentlyDenied) {
      return CameraPermissionResult.permanentlyDenied;
    }

    final requested = await Permission.camera.request();
    if (requested.isGranted) {
      return CameraPermissionResult.granted;
    }
    if (requested.isPermanentlyDenied) {
      return CameraPermissionResult.permanentlyDenied;
    }
    return CameraPermissionResult.denied;
  }

  static Future<bool> openSettings() => openAppSettings();
}
