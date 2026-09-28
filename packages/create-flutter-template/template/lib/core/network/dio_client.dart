import 'package:dio/dio.dart';

import '../constants/app_constants.dart';
import '../logging/local_logger.dart';
import '../logging/log_entry.dart';
import 'auth_interceptor.dart';

/// Hook for token refresh — wire to your auth repository when ready.
Future<bool> refreshAuthSession() async => false;

class DioClient {
  DioClient._();

  static Dio? _dio;

  static Dio get instance {
    _dio ??= _create();
    return _dio!;
  }

  static Dio _create() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 90),
        sendTimeout: const Duration(seconds: 60),
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          LocalLogger.instance.info(
            LogCategory.network,
            '${options.method} ${options.uri}',
            {'path': options.path},
          );
          handler.next(options);
        },
        onResponse: (response, handler) {
          LocalLogger.instance.info(
            LogCategory.network,
            '← ${response.statusCode} ${response.requestOptions.uri}',
            {'status': response.statusCode},
          );
          handler.next(response);
        },
        onError: (error, handler) {
          LocalLogger.instance.error(
            LogCategory.network,
            '✗ ${error.message}',
            {
              'type': error.type.name,
              'status': error.response?.statusCode,
              'path': error.requestOptions.path,
            },
          );
          handler.next(error);
        },
      ),
    );

    dio.interceptors.add(
      AuthInterceptor(
        dio: dio,
        onRefresh: refreshAuthSession,
      ),
    );

    return dio;
  }

  /// Allow tests / settings to swap base URL.
  static void reset({String? baseUrl}) {
    _dio = null;
    if (baseUrl != null) {
      _dio = _create()..options.baseUrl = baseUrl;
    }
  }
}
