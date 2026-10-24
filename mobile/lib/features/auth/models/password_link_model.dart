import 'dart:convert';

class PasswordLinkInfoModel {
  final String email;
  final String fullName;
  final bool activation;

  const PasswordLinkInfoModel({
    required this.email,
    required this.fullName,
    required this.activation,
  });

  factory PasswordLinkInfoModel.fromJson(Map<String, dynamic> json) {
    return PasswordLinkInfoModel(
      email: json['email']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      activation: json['activation'] == true,
    );
  }
}

class PasswordValidationResult {
  final bool isValid;
  final String? errorMessage;
  final double strengthScore; // 0.0 to 1.0
  final String strengthLabel;

  const PasswordValidationResult({
    required this.isValid,
    this.errorMessage,
    required this.strengthScore,
    required this.strengthLabel,
  });
}

class PasswordPolicyUtils {
  PasswordPolicyUtils._();

  static const int minLength = 8;
  static const int maxUtf8Bytes = 72;

  /// Extract raw token from full URL or return trimmed token
  static String extractToken(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) return '';

    // Check if it's a URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        final uri = Uri.parse(trimmed);
        final token = uri.queryParameters['token'];
        if (token != null && token.isNotEmpty) {
          return token.trim();
        }
      } catch (_) {}
    }

    // Check if user pasted `token=abc...`
    if (trimmed.contains('token=')) {
      final parts = trimmed.split('token=');
      if (parts.length > 1) {
        final tokenPart = parts[1].split('&').first;
        return tokenPart.trim();
      }
    }

    return trimmed;
  }

  /// Validates password according to Spring Boot backend policy & provides strength
  static PasswordValidationResult evaluatePassword(String password) {
    if (password.isEmpty) {
      return const PasswordValidationResult(
        isValid: false,
        errorMessage: 'Vui lòng nhập mật khẩu',
        strengthScore: 0.0,
        strengthLabel: 'Trống',
      );
    }

    final bytesLength = utf8.encode(password).length;

    if (password.length < minLength) {
      return PasswordValidationResult(
        isValid: false,
        errorMessage: 'Mật khẩu phải có tối thiểu $minLength ký tự (hiện có ${password.length})',
        strengthScore: 0.25,
        strengthLabel: 'Quá ngắn',
      );
    }

    if (bytesLength > maxUtf8Bytes) {
      return const PasswordValidationResult(
        isValid: false,
        errorMessage: 'Mật khẩu vượt quá giới hạn 72 byte của hệ thống mã hóa',
        strengthScore: 0.5,
        strengthLabel: 'Quá dài',
      );
    }

    // Strength evaluation
    int score = 1;
    if (password.length >= 10) score++;
    if (password.contains(RegExp(r'[0-9]'))) score++;
    if (password.contains(RegExp(r'[A-Z]'))) score++;
    if (password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) score++;

    double normalizedScore = (score / 5.0).clamp(0.2, 1.0);
    String label = 'Yếu';
    if (normalizedScore >= 0.8) {
      label = 'Rất mạnh';
    } else if (normalizedScore >= 0.6) {
      label = 'Mạnh';
    } else if (normalizedScore >= 0.4) {
      label = 'Trung bình';
    }

    return PasswordValidationResult(
      isValid: true,
      errorMessage: null,
      strengthScore: normalizedScore,
      strengthLabel: label,
    );
  }
}
