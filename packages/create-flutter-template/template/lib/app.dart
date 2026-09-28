import 'package:flutter/material.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_template_app/l10n/app_localizations.dart';

import 'core/constants/app_constants.dart';
import 'core/logging/shake_to_open_logs.dart';
import 'core/theme/app_theme.dart';
import 'router/app_router.dart';

class FlutterTemplateApp extends StatelessWidget {
  const FlutterTemplateApp({super.key, required this.router});

  final GoRouter router;

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(
        AppConstants.designWidth,
        AppConstants.designHeight,
      ),
      minTextAdapt: true,
      builder: (context, child) {
        return MaterialApp.router(
          title: 'Flutter Template',
          theme: AppTheme.light,
          routerConfig: router,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          builder: (context, child) {
            final loaded = EasyLoading.init()(context, child);
            return ShakeToOpenLogs(
              navigatorKey: rootNavigatorKey,
              child: loaded,
            );
          },
          debugShowCheckedModeBanner: false,
        );
      },
    );
  }
}
