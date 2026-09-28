import 'package:gal/gal.dart';
import 'package:permission_handler/permission_handler.dart';

/// Add-only photo library access used when saving an image.
class PhotoLibraryPermission {
  PhotoLibraryPermission._();

  static Future<bool> hasAddAccess() => Gal.hasAccess();

  static Future<bool> requestAddAccess() => Gal.requestAccess();

  static Future<bool> openSettings() => openAppSettings();
}
