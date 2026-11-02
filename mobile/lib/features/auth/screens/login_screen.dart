import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_content.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../providers/auth_provider.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  String? _emailError;
  String? _passwordError;
  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final auth = context.read<AuthProvider>();
    if (auth.isLoading) return;
    setState(() {
      _emailError = _emailController.text.trim().isEmpty
          ? 'Vui lòng nhập email.'
          : null;
      _passwordError = _passwordController.text.isEmpty
          ? 'Vui lòng nhập mật khẩu.'
          : null;
    });
    if (_emailError != null || _passwordError != null) return;
    FocusScope.of(context).unfocus();
    await auth.login(
      email: _emailController.text,
      password: _passwordController.text,
      role: 'STUDENT',
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      body: SafeArea(
        child: AppContent(
          child: AutofillGroup(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 32),
              children: [
                const Icon(
                  Icons.school_outlined,
                  size: 48,
                  color: AppColors.primaryLight,
                ),
                const SizedBox(height: 16),
                Text(
                  'AIVES',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.headlineXl,
                ),
                const SizedBox(height: 8),
                Text(
                  'Thi vấn đáp trực tuyến',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.headlineMd,
                ),
                const SizedBox(height: 12),
                Text(
                  'Đăng nhập bằng tài khoản sinh viên để xem lịch và tham gia ca thi.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodyMd,
                ),
                const SizedBox(height: 32),
                GlassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Đăng nhập', style: AppTextStyles.headlineMd),
                      const SizedBox(height: 24),
                      TextField(
                        controller: _emailController,
                        enabled: !auth.isLoading,
                        autofillHints: const [
                          AutofillHints.username,
                          AutofillHints.email,
                        ],
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autocorrect: false,
                        style: AppTextStyles.bodyMd.copyWith(
                          color: AppColors.textPrimary,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Email FPT',
                          errorText: _emailError,
                          errorMaxLines: 3,
                          prefixIcon: const Icon(Icons.email_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _passwordController,
                        enabled: !auth.isLoading,
                        obscureText: _obscurePassword,
                        autofillHints: const [AutofillHints.password],
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _handleLogin(),
                        autocorrect: false,
                        enableSuggestions: false,
                        style: AppTextStyles.bodyMd.copyWith(
                          color: AppColors.textPrimary,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Mật khẩu',
                          errorText: _passwordError,
                          errorMaxLines: 3,
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            tooltip: _obscurePassword
                                ? 'Hiện mật khẩu'
                                : 'Ẩn mật khẩu',
                            onPressed: () => setState(
                              () => _obscurePassword = !_obscurePassword,
                            ),
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: auth.isLoading
                              ? null
                              : () => Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ForgotPasswordScreen(
                                      prefilledEmail: _emailController.text,
                                    ),
                                  ),
                                ),
                          child: const Text('Quên mật khẩu?'),
                        ),
                      ),
                      if (auth.errorMessage != null) ...[
                        AppMessage(message: auth.errorMessage!, isError: true),
                        const SizedBox(height: 16),
                      ],
                      PrimaryButton(
                        text: 'Đăng nhập',
                        icon: Icons.login,
                        isLoading: auth.isLoading,
                        onPressed: _handleLogin,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Tài khoản giảng viên và quản trị viên sử dụng trên website.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodySm,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
