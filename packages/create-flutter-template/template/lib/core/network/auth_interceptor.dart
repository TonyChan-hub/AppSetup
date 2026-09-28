import 'package:dio/dio.dart';

import '../constants/app_constants.dart';
import 'auth_token_store.dart';

/// Retries failed requests after refreshing access tokens on HTTP 401.
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required Dio dio,
    required Future<bool> Function() onRefresh,
  })  : _dio = dio,
        _onRefresh = onRefresh;

  final Dio _dio;
  final Future<bool> Function() _onRefresh;

  static const _retriedKey = 'auth_retried';

  Future<bool>? _refreshFuture;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (!_isAuthExempt(options.path)) {
      final token = AuthTokenStore.accessToken;
      if (token != null &&
          token.isNotEmpty &&
          options.headers['Authorization'] == null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final status = err.response?.statusCode;
    final options = err.requestOptions;

    if (status != 401 ||
        _isAuthExempt(options.path) ||
        options.extra[_retriedKey] == true) {
      handler.next(err);
      return;
    }

    final refreshed = await _refreshOnce();
    if (!refreshed) {
      handler.next(err);
      return;
    }

    final token = AuthTokenStore.accessToken;
    if (token == null || token.isEmpty) {
      handler.next(err);
      return;
    }

    try {
      final response = await _dio.fetch<dynamic>(
        options.copyWith(
          extra: {...options.extra, _retriedKey: true},
          headers: {
            ...options.headers,
            'Authorization': 'Bearer $token',
          },
        ),
      );
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  Future<bool> _refreshOnce() {
    _refreshFuture ??= _onRefresh().whenComplete(() => _refreshFuture = null);
    return _refreshFuture!;
  }

  static bool _isAuthExempt(String path) {
    return path.contains(AppConstants.guestLoginPath) ||
        path.contains(AppConstants.refreshTokenPath);
  }
}
