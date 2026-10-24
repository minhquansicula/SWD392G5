import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/models/password_link_model.dart';

void main() {
  group('PasswordPolicyUtils Tests', () {
    test('extractToken handles raw token and URLs correctly', () {
      expect(PasswordPolicyUtils.extractToken('abc-123-xyz'), 'abc-123-xyz');
      expect(
        PasswordPolicyUtils.extractToken('https://aives.edu.vn/set-password?token=secret-uuid-123'),
        'secret-uuid-123',
      );
      expect(
        PasswordPolicyUtils.extractToken('http://localhost:3000/auth/password/set?foo=bar&token=my-token-456'),
        'my-token-456',
      );
      expect(
        PasswordPolicyUtils.extractToken('token=quick-token-789&lang=vi'),
        'quick-token-789',
      );
    });

    test('evaluatePassword validates minimum 8 characters', () {
      final shortRes = PasswordPolicyUtils.evaluatePassword('1234567');
      expect(shortRes.isValid, false);
      expect(shortRes.errorMessage, contains('tối thiểu 8 ký tự'));
    });

    test('evaluatePassword validates BCrypt 72 UTF-8 bytes limit', () {
      // 73 ASCII characters
      final tooLongAscii = 'a' * 73;
      final longRes = PasswordPolicyUtils.evaluatePassword(tooLongAscii);
      expect(longRes.isValid, false);
      expect(longRes.errorMessage, contains('72 byte'));
    });

    test('evaluatePassword accepts valid passwords and assesses strength', () {
      final simpleRes = PasswordPolicyUtils.evaluatePassword('password123');
      expect(simpleRes.isValid, true);
      expect(simpleRes.strengthScore >= 0.4, true);

      final strongRes = PasswordPolicyUtils.evaluatePassword('P@ssw0rd!2026');
      expect(strongRes.isValid, true);
      expect(strongRes.strengthScore >= 0.8, true);
      expect(strongRes.strengthLabel, 'Rất mạnh');
    });
  });
}
