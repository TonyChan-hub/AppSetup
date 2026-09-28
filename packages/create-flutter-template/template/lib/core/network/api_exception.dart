/// Classifies [ApiException] so UI can localize without Dio wording.
enum ApiErrorKind {
  connectionTimeout,
  sendTimeout,
  receiveTimeout,
  connectionError,
  other,
}

/// Thin wrapper around network / API failures.
class ApiException implements Exception {
  const ApiException(
    this.message, {
    this.statusCode,
    this.kind = ApiErrorKind.other,
  });

  final String message;
  final int? statusCode;
  final ApiErrorKind kind;

  @override
  String toString() => message;
}
