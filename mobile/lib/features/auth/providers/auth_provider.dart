import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../models/user_model.dart';
import '../models/password_link_model.dart';

class AuthProvider extends ChangeNotifier {
  static const String _tokenKey = 'aives_access_token';

  UserModel? _currentUser;
  bool _isLoading = false;
  bool _isInitializing = true;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  bool get isInitializing => _isInitializing;
  String? get errorMessage => _errorMessage;

  AuthProvider() {
    restoreSession();
  }

  /// Khôi phục phiên đăng nhập từ SharedPreferences qua GET /api/auth/me
  Future<void> restoreSession() async {
    _isInitializing = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final savedToken = prefs.getString(_tokenKey);

      if (savedToken != null && savedToken.trim().isNotEmpty) {
        ApiClient.instance.setAuthToken(savedToken.trim());
        debugPrint('[AuthProvider] Found saved token, validating via ${ApiEndpoints.currentUser}...');

        final res = await ApiClient.instance.get(ApiEndpoints.currentUser);
        if (res.success && res.data != null) {
          final userObj = res.data is Map
              ? Map<String, dynamic>.from(res.data as Map)
              : <String, dynamic>{};
          _currentUser = UserModel.fromJson(userObj, token: savedToken);
          debugPrint('[AuthProvider] Session restored: ${_currentUser?.fullName} (${_currentUser?.userCode})');
        } else {
          debugPrint('[AuthProvider] Token invalid or expired (${res.statusCode}), clearing session.');
          await prefs.remove(_tokenKey);
          ApiClient.instance.setAuthToken(null);
          _currentUser = null;
        }
      }
    } catch (e) {
      debugPrint('[AuthProvider] Error restoring session: $e');
    } finally {
      _isInitializing = false;
      notifyListeners();
    }
  }

  /// Đăng nhập tài khoản sinh viên FPT qua POST /api/auth/login
  Future<bool> login({
    required String email,
    required String password,
    String role = 'STUDENT',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final inputIdentifier = email.trim();
    final trimmedPass = password.trim();

    if (inputIdentifier.isEmpty) {
      _errorMessage = 'Vui lòng nhập Email FPT';
      _isLoading = false;
      notifyListeners();
      return false;
    }

    if (trimmedPass.isEmpty) {
      _errorMessage = 'Vui lòng nhập mật khẩu';
      _isLoading = false;
      notifyListeners();
      return false;
    }

    try {
      // 1. Gọi trực tiếp API Spring Boot Backend: POST /api/auth/login
      final res = await ApiClient.instance.post(
        ApiEndpoints.login,
        body: {
          'email': inputIdentifier,
          'password': trimmedPass,
        },
      );

      // 2. Kiểm tra phản hồi từ Backend
      if (res.success && res.data != null) {
        final data = res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
        final token = data['token']?.toString();
        final userObj = data['user'] is Map
            ? Map<String, dynamic>.from(data['user'] as Map)
            : Map<String, dynamic>.from(data);

        ApiClient.instance.setAuthToken(token);
        _currentUser = UserModel.fromJson(userObj, token: token);

        // Lưu JWT token vào SharedPreferences để ghi nhớ đăng nhập
        if (token != null && token.isNotEmpty) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_tokenKey, token);
        }

        _isLoading = false;
        notifyListeners();
        debugPrint('[AuthProvider] Login successfully from Spring Boot: ${_currentUser?.fullName} (${_currentUser?.userCode})');
        return true;
      }

      // Xử lý lỗi khi Backend từ chối hoặc không phản hồi
      if (res.statusCode == 0) {
        _errorMessage = 'Không thể kết nối đến máy chủ Backend (${ApiClient.instance.baseUrl}). Vui lòng kiểm tra mạng hoặc server.';
      } else {
        _errorMessage = res.message.isNotEmpty
            ? res.message
            : 'Email FPT hoặc mật khẩu không chính xác.';
      }

      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('[AuthProvider] Error during login: $e');
      _errorMessage = 'Đăng nhập thất bại: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Đăng xuất và xóa sạch session token
  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tokenKey);
    } catch (e) {
      debugPrint('[AuthProvider] Error clearing token on logout: $e');
    }
    ApiClient.instance.setAuthToken(null);
    _currentUser = null;
    notifyListeners();
  }

  /// Gửi yêu cầu đặt lại mật khẩu: POST /api/auth/password/forgot
  Future<ApiResponseData<dynamic>> requestForgotPassword(String email) async {
    final cleanEmail = email.trim();
    if (cleanEmail.isEmpty) {
      return ApiResponseData(
        success: false,
        statusCode: 400,
        message: 'Vui lòng nhập email tài khoản của bạn',
      );
    }

    try {
      final res = await ApiClient.instance.post(
        ApiEndpoints.forgotPassword,
        body: {'email': cleanEmail},
      );
      return res;
    } catch (e) {
      return ApiResponseData(
        success: false,
        statusCode: 500,
        message: 'Không thể gửi yêu cầu đặt lại mật khẩu: $e',
      );
    }
  }

  /// Kiểm tra tính hợp lệ của Token / Link một lần: POST /api/auth/password/link
  Future<PasswordLinkInfoModel?> checkPasswordLink(String rawInput) async {
    final token = PasswordPolicyUtils.extractToken(rawInput);
    if (token.isEmpty) {
      throw Exception('Vui lòng nhập hoặc dán mã Token hợp lệ');
    }

    final res = await ApiClient.instance.post(
      ApiEndpoints.checkPasswordLink,
      body: {'token': token},
    );

    if (res.success && res.data != null) {
      final dataMap = res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
      return PasswordLinkInfoModel.fromJson(dataMap);
    }

    if (res.statusCode == 400) {
      throw Exception('Link hoặc mã Token không hợp lệ, đã được dùng hoặc đã hết hạn.');
    }

    throw Exception(res.message.isNotEmpty ? res.message : 'Không thể xác thực link với máy chủ. Vui lòng thử lại.');
  }

  /// Đặt mật khẩu mới bằng Token: POST /api/auth/password/set
  Future<ApiResponseData<dynamic>> setPasswordWithToken({
    required String rawInput,
    required String newPassword,
  }) async {
    final token = PasswordPolicyUtils.extractToken(rawInput);
    if (token.isEmpty) {
      return ApiResponseData(
        success: false,
        statusCode: 400,
        message: 'Mã Token không hợp lệ hoặc bị trống',
      );
    }

    final validation = PasswordPolicyUtils.evaluatePassword(newPassword);
    if (!validation.isValid) {
      return ApiResponseData(
        success: false,
        statusCode: 400,
        message: validation.errorMessage ?? 'Mật khẩu không thỏa mãn yêu cầu bảo mật',
      );
    }

    try {
      final res = await ApiClient.instance.post(
        ApiEndpoints.setPassword,
        body: {
          'token': token,
          'newPassword': newPassword,
        },
      );
      return res;
    } catch (e) {
      return ApiResponseData(
        success: false,
        statusCode: 500,
        message: 'Không thể cập nhật mật khẩu: $e',
      );
    }
  }
}
