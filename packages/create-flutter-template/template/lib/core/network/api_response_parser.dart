import 'api_exception.dart';

abstract final class ApiResponseParser {
  static T parseData<T>(
    Map<String, dynamic>? body, {
    required T Function(Map<String, dynamic> data) mapper,
    int? statusCode,
    String emptyMessage = 'Empty response',
    String invalidMessage = 'Invalid response',
    String failedMessage = 'Request failed',
  }) {
    if (body == null) {
      throw ApiException(emptyMessage, statusCode: statusCode);
    }

    final code = body['code'] as int?;
    if (code != null && code != 0) {
      throw ApiException(
        body['message'] as String? ?? failedMessage,
        statusCode: statusCode,
      );
    }

    final data = body['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException(invalidMessage, statusCode: statusCode);
    }

    return mapper(data);
  }
}
