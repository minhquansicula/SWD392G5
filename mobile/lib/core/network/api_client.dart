import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../constants/api_endpoints.dart';

class ApiResponseData<T> {
  final bool success;
  final int statusCode;
  final String message;
  final T? data;

  ApiResponseData({
    required this.success,
    required this.statusCode,
    required this.message,
    this.data,
  });
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();
  static final ApiClient instance = ApiClient();
  final http.Client _client;
  void Function()? onUnauthorized;

  String _baseUrl = ApiEndpoints.defaultBaseUrl;
  String? _authToken;

  String get baseUrl => _baseUrl;
  String? get authToken => _authToken;

  void setBaseUrl(String url) {
    _baseUrl = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  void setAuthToken(String? token) {
    _authToken = token;
  }

  Map<String, String> _buildHeaders({
    Map<String, String>? extraHeaders,
    bool authenticated = true,
  }) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (authenticated && _authToken != null && _authToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    if (extraHeaders != null) {
      headers.addAll(extraHeaders);
    }
    return headers;
  }

  /// Sends a POST request
  Future<ApiResponseData<dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    bool authenticated = true,
    Duration timeout = const Duration(seconds: 15),
    String? baseUrl,
  }) async {
    final requestToken = _authToken;
    try {
      final url = Uri.parse('${baseUrl ?? _baseUrl}$endpoint');
      final response = await _client
          .post(
            url,
            headers: _buildHeaders(authenticated: authenticated),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeout);

      if (authenticated &&
          response.statusCode == 401 &&
          requestToken == _authToken) {
        onUnauthorized?.call();
      }
      return _parseResponse(response);
    } on SocketException catch (e) {
      debugPrint('[ApiClient] POST connection failed: $e');
      return ApiResponseData(
        success: false,
        statusCode: 0,
        message: 'Không thể kết nối đến máy chủ Backend.',
      );
    } on TimeoutException {
      debugPrint('[ApiClient] POST timeout');
      return ApiResponseData(
        success: false,
        statusCode: 408,
        message: 'Hết thời gian chờ phản hồi từ máy chủ Backend.',
      );
    } catch (e) {
      debugPrint('[ApiClient] POST failed: $e');
      return ApiResponseData(
        success: false,
        statusCode: 500,
        message: 'Lỗi mạng hoặc hệ thống: $e',
      );
    }
  }

  /// Sends a GET request
  Future<ApiResponseData<dynamic>> get(
    String endpoint, {
    Map<String, String>? queryParams,
    Duration timeout = const Duration(seconds: 15),
    String? baseUrl,
  }) async {
    final requestToken = _authToken;
    try {
      var uri = Uri.parse('${baseUrl ?? _baseUrl}$endpoint');
      if (queryParams != null && queryParams.isNotEmpty) {
        uri = uri.replace(queryParameters: queryParams);
      }
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(timeout);

      if (response.statusCode == 401 && requestToken == _authToken) {
        onUnauthorized?.call();
      }
      return _parseResponse(response);
    } on SocketException catch (e) {
      debugPrint('[ApiClient] GET connection failed: $e');
      return ApiResponseData(
        success: false,
        statusCode: 0,
        message: 'Không thể kết nối đến máy chủ Backend.',
      );
    } on TimeoutException {
      debugPrint('[ApiClient] GET timeout');
      return ApiResponseData(
        success: false,
        statusCode: 408,
        message: 'Hết thời gian chờ kết nối Backend.',
      );
    } catch (e) {
      debugPrint('[ApiClient] GET failed: $e');
      return ApiResponseData(
        success: false,
        statusCode: 500,
        message: 'Lỗi kết nối: $e',
      );
    }
  }

  ApiResponseData<dynamic> _parseResponse(http.Response response) {
    if (response.statusCode == 204) {
      return ApiResponseData(
        success: true,
        statusCode: 204,
        message: 'Thành công',
      );
    }
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        // Handle Spring Boot standard ApiResponse: { code: 200, message: "...", data: ... }
        final data =
            decoded is Map<String, dynamic> && decoded.containsKey('data')
            ? decoded['data']
            : decoded;
        final msg =
            decoded is Map<String, dynamic> && decoded.containsKey('message')
            ? decoded['message'].toString()
            : 'Thành công';

        return ApiResponseData(
          success: !(decoded is Map && decoded['success'] == false),
          statusCode: response.statusCode,
          message: msg,
          data: data,
        );
      } else {
        final errorMsg =
            decoded is Map<String, dynamic> && decoded.containsKey('message')
            ? decoded['message'].toString()
            : decoded is Map && decoded['detail'] is String
            ? decoded['detail'] as String
            : 'Lỗi máy chủ (${response.statusCode})';

        return ApiResponseData(
          success: false,
          statusCode: response.statusCode,
          message: errorMsg,
          data: decoded,
        );
      }
    } catch (e) {
      return ApiResponseData(
        success: false,
        statusCode: response.statusCode,
        message: 'Mã phản hồi HTTP: ${response.statusCode}',
        data: response.body,
      );
    }
  }
}
