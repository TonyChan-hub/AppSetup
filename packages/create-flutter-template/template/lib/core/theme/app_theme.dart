import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import 'cupertino_predictive_back_page_transitions.dart';

/// Compile-time palette so Dart color previews work at `AppColors.*` call sites.
abstract final class AppColors {
  static const primary = Color(0xFF3C82F6);
  static const onPrimary = Colors.white;
  static const onSurface = Color(0xFF132135);
  static const onSurfaceVariant = Color(0xFF676767);
  static const surface = Colors.white;
  static const surfaceContainer = Color(0xFFF6F7FB);
  static const surfaceContainerHigh = Color(0xFFF0F0F0);
  static const outline = Color(0xFFE7E7E7);
  static const outlineVariant = Color(0xFFBABABA);
  static const tertiary = Color(0xFF22C55E);
  static const onTertiary = Colors.white;
  static const tertiaryContainer = Color(0xFFDCFCE7);
  static const onTertiaryContainer = tertiary;
  static const error = Color(0xFFEB3E3E);
  static const onError = Colors.white;
  static const errorContainer = Color(0xFFFCDCDC);
  static const onErrorContainer = error;
  static const shadow = Color(0xFF3B66A2);
}

/// System bar styles for the app-wide `SystemUiMode.edgeToEdge` setup.
abstract final class AppSystemOverlay {
  static const lightBackground = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarDividerColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
    systemNavigationBarIconBrightness: Brightness.dark,
  );

  static const darkBackground = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarDividerColor: Colors.transparent,
    systemNavigationBarContrastEnforced: false,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarIconBrightness: Brightness.light,
  );
}

class AppTheme {
  AppTheme._();

  static ThemeData get light {
    const font = 'Poppins';

    const colorScheme = ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      secondary: AppColors.primary,
      onSecondary: AppColors.onPrimary,
      surface: AppColors.surface,
      onSurface: AppColors.onSurface,
      onSurfaceVariant: AppColors.onSurfaceVariant,
      surfaceContainer: AppColors.surfaceContainer,
      surfaceContainerHigh: AppColors.surfaceContainerHigh,
      outline: AppColors.outline,
      outlineVariant: AppColors.outlineVariant,
      tertiary: AppColors.tertiary,
      onTertiary: AppColors.onTertiary,
      tertiaryContainer: AppColors.tertiaryContainer,
      onTertiaryContainer: AppColors.onTertiaryContainer,
      error: AppColors.error,
      onError: AppColors.onError,
      errorContainer: AppColors.errorContainer,
      onErrorContainer: AppColors.onErrorContainer,
      shadow: AppColors.shadow,
      surfaceTint: AppColors.primary,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: font,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: colorScheme.surface,
      dividerColor: colorScheme.outline,
      dividerTheme: DividerThemeData(
        color: colorScheme.outline,
        thickness: 1,
        space: 1,
      ),
      iconTheme: IconThemeData(color: colorScheme.onSurface),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android:
              CupertinoPredictiveBackPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        centerTitle: true,
        systemOverlayStyle: AppSystemOverlay.lightBackground,
      ),
      textTheme: const TextTheme(
        displaySmall: TextStyle(
          fontFamily: font,
          fontSize: 32,
          fontWeight: FontWeight.w700,
          height: 1,
          color: AppColors.onSurface,
        ),
        headlineSmall: TextStyle(
          fontFamily: font,
          fontSize: 24,
          fontWeight: FontWeight.w800,
          height: 36 / 24,
          color: AppColors.onSurface,
        ),
        titleLarge: TextStyle(
          fontFamily: font,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          height: 24 / 20,
          color: AppColors.onSurface,
        ),
        titleMedium: TextStyle(
          fontFamily: font,
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppColors.onSurface,
        ),
        titleSmall: TextStyle(
          fontFamily: font,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          height: 22 / 14,
          color: AppColors.onSurface,
        ),
        bodyLarge: TextStyle(
          fontFamily: font,
          fontSize: 16,
          fontWeight: FontWeight.w500,
          height: 20 / 16,
          color: AppColors.onSurface,
        ),
        bodyMedium: TextStyle(
          fontFamily: font,
          fontSize: 14,
          fontWeight: FontWeight.w500,
          height: 20 / 14,
          color: AppColors.onSurfaceVariant,
        ),
        bodySmall: TextStyle(
          fontFamily: font,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          height: 16 / 12,
          color: AppColors.onSurfaceVariant,
        ),
        labelLarge: TextStyle(
          fontFamily: font,
          fontSize: 16,
          fontWeight: FontWeight.w700,
          height: 22 / 16,
          color: AppColors.onSurface,
        ),
        labelMedium: TextStyle(
          fontFamily: font,
          fontSize: 12,
          fontWeight: FontWeight.w600,
          height: 16 / 12,
          color: AppColors.onSurface,
        ),
        labelSmall: TextStyle(
          fontFamily: font,
          fontSize: 10,
          fontWeight: FontWeight.w500,
          height: 16 / 10,
          color: AppColors.onSurfaceVariant,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(38),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colorScheme.primary,
          side: BorderSide(color: colorScheme.primary, width: 2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
        ),
      ),
    );
  }
}

extension AppThemeText on BuildContext {
  TextTheme get appText => Theme.of(this).textTheme;
}

extension AppTextStyleScale on TextStyle {
  /// Scales [fontSize] with ScreenUtil (design width 390).
  TextStyle get sp {
    final size = fontSize;
    return size == null ? this : copyWith(fontSize: size.sp);
  }
}
