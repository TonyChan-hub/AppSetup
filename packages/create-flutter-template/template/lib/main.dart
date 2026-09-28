import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'core/theme/app_theme.dart';
import 'providers/app_providers.dart';
import 'router/app_router.dart';
import 'services/device_identity/device_identity_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await DeviceIdentityService.init();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(AppSystemOverlay.lightBackground);

  final router = createAppRouter();

  runApp(
    MultiProvider(
      providers: appProviders,
      child: FlutterTemplateApp(router: router),
    ),
  );
}
