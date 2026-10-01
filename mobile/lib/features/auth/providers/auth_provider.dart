import 'package:flutter/material.dart';
import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _currentUser; // Starts logged out so LoginScreen is displayed
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<bool> login({
    required String username,
    required String password,
    String role = 'STUDENT',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await Future.delayed(const Duration(milliseconds: 650));

      final trimmedUser = username.trim();
      final trimmedPass = password.trim();

      if (trimmedUser.isEmpty) {
        _errorMessage = 'Vui lòng nhập Mã số sinh viên hoặc Email';
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

      // Determine display name and student code
      String fullName = 'Sinh Viên FPT';
      if (trimmedUser.toLowerCase().contains('hoang')) {
        fullName = 'Nguyễn Minh Hoàng';
      } else if (trimmedUser.toLowerCase().contains('quan')) {
        fullName = 'Minh Quân';
      } else if (trimmedUser.toLowerCase().contains('student')) {
        fullName = 'Trần Văn Sinh Viên';
      }

      String userCode = trimmedUser.toUpperCase();
      if (!userCode.startsWith('SE') && !userCode.startsWith('IA') && !userCode.startsWith('GD')) {
        userCode = 'SE170245';
      }

      _currentUser = UserModel(
        id: 'usr-student-${DateTime.now().millisecondsSinceEpoch}',
        username: trimmedUser,
        fullName: fullName,
        userCode: userCode,
        role: role,
        department: 'Kỹ thuật Phần mềm (FIT Dept)',
        semester: 'Fall 2026',
        token: 'token_jwt_${DateTime.now().millisecondsSinceEpoch}',
      );

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Đăng nhập thất bại: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void logout() {
    _currentUser = null;
    notifyListeners();
  }

  void loginAsDemoStudent() {
    _currentUser = UserModel.mockStudent();
    notifyListeners();
  }
}
