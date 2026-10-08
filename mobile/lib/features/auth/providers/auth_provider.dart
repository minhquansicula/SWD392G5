import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<bool> login({
    required String email,
    required String password,
    String? username,
    String role = 'STUDENT',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final inputIdentifier = (username ?? email).trim();
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
          'username': inputIdentifier,
          'email': inputIdentifier,
          'password': trimmedPass,
        },
      );

      // 2. Kiểm tra phản hồi từ Backend (KHÔNG dùng cơ chế dự phòng mock)
      if (res.success && res.data != null) {
        final data = res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
        final token = data['token']?.toString();
        final userObj = data['user'] is Map
            ? Map<String, dynamic>.from(data['user'] as Map)
            : Map<String, dynamic>.from(data);

        ApiClient.instance.setAuthToken(token);
        _currentUser = UserModel.fromJson(userObj, token: token);
        _isLoading = false;
        notifyListeners();
        debugPrint('[AuthProvider] Login successfully from Spring Boot: ${_currentUser?.fullName} (${_currentUser?.userCode})');
        return true;
      }

      // Xử lý lỗi khi Backend từ chối hoặc không phản hồi
      if (res.statusCode == 0) {
        _errorMessage = 'Không thể kết nối đến máy chủ Backend (${ApiClient.instance.baseUrl}). Vui lòng kiểm tra kết nối mạng hoặc bật server.';
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

  void logout() {
    ApiClient.instance.setAuthToken(null);
    _currentUser = null;
    notifyListeners();
  }
}
