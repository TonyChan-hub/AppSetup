import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:zippy_flutter/zippy_flutter.dart';

import 'app.dart';
import 'core/network/dio_client.dart';
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

  await ZippyProbe.start();
  // Touch Dio so Zippy network interceptor attaches in debug.
  DioClient.instance;
  final docs = await getApplicationDocumentsDirectory();
  ZippyProbe.registerSqliteDatabase(
    'app_logs.db',
    p.join(docs.path, 'app_logs.db'),
  );
  ZippyProbe.registerSqliteDatabase(
    'app_local.db',
    p.join(docs.path, 'app_local.db'),
  );

  final router = createAppRouter();

  runApp(
    MultiProvider(
      providers: appProviders,
      child: FlutterTemplateApp(router: router),
    ),
  );
}
