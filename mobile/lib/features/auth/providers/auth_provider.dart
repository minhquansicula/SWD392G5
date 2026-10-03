import 'package:flutter/material.dart';
import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _currentUser = UserModel.mockStudent(); // Default logged in as demo student
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
      // In demo mode or if connecting to backend:
      await Future.delayed(const Duration(milliseconds: 600));

      if (username.trim().isEmpty) {
        _errorMessage = 'Vui lòng nhập Mã số sinh viên hoặc Email';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Populate student info
      _currentUser = UserModel(
        id: 'usr-student-${DateTime.now().millisecondsSinceEpoch}',
        username: username,
        fullName: username.toLowerCase().contains('hoang') ? 'Nguyễn Minh Hoàng' : 'Sinh Viên FPT',
        userCode: username.toUpperCase().startsWith('SE') ? username.toUpperCase() : 'SE170245',
        role: role,
        department: 'Kỹ thuật Phần mềm (FIT Dept)',
        semester: 'Fall 2026',
        token: 'token_mock_${DateTime.now().millisecondsSinceEpoch}',
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
