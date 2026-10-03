import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/glass_card.dart';
import '../providers/auth_provider.dart';
import '../../home/screens/main_navigation_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController(text: 'SE170245');
  final _passwordController = TextEditingController(text: '••••••••');
  bool _obscurePassword = true;
  int _selectedRoleIndex = 0; // 0: Sinh viên, 1: Giảng viên, 2: Admin

  final List<String> _roles = [
    'Sinh viên (Student)',
    'Giảng viên (Lecturer)',
    'Admin',
  ];

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (_selectedRoleIndex != 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.surfaceCardHigh,
          content: Text(
            'Cổng Giảng viên & Admin hiện hỗ trợ tốt nhất trên nền tảng Web AIVES. Đang chuyển về chế độ Sinh viên...',
            style: AppTextStyles.bodyMd.copyWith(color: AppColors.warning),
          ),
          duration: const Duration(seconds: 3),
        ),
      );
      setState(() => _selectedRoleIndex = 0);
      return;
    }

    final auth = context.read<AuthProvider>();
    final success = await auth.login(
      username: _usernameController.text,
      password: _passwordController.text,
      role: 'STUDENT',
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
      );
    } else if (mounted && auth.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.dangerDark,
          content: Text(auth.errorMessage!),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Ambient Neon Glowing Orbs Background
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withValues(alpha: 0.18),
              ),
            ),
          ),
          Positioned(
            top: 200,
            left: -80,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.secondary.withValues(alpha: 0.15),
              ),
            ),
          ),

          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Brand Logo & Heading
                    Center(
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.45),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.psychology_rounded,
                          size: 42,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'AIVES',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.headlineXl.copyWith(
                        letterSpacing: 1.5,
                        foreground: Paint()
                          ..shader = const LinearGradient(
                            colors: [Colors.white, AppColors.primaryGlow],
                          ).createShader(const Rect.fromLTWH(0, 0, 200, 70)),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'AI-Powered Viva Exam System',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.bodySm.copyWith(
                        color: AppColors.textMuted,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Role Selector Tabs
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceCardLow,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.borderGlass),
                      ),
                      child: Row(
                        children: List.generate(_roles.length, (index) {
                          final isSelected = _selectedRoleIndex == index;
                          return Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _selectedRoleIndex = index),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppColors.primary : Colors.transparent,
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: isSelected
                                      ? [
                                          BoxShadow(
                                            color: AppColors.primary.withValues(alpha: 0.4),
                                            blurRadius: 8,
                                            offset: const Offset(0, 2),
                                          )
                                        ]
                                      : null,
                                ),
                                child: Text(
                                  index == 0 ? 'Sinh viên' : index == 1 ? 'Giảng viên' : 'Admin',
                                  textAlign: TextAlign.center,
                                  style: AppTextStyles.labelBold.copyWith(
                                    fontSize: 12,
                                    color: isSelected ? Colors.white : AppColors.textMuted,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Login Card
                    GlassCard(
                      padding: const EdgeInsets.all(22),
                      borderRadius: 20,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Mã số sinh viên (Student ID)',
                            style: AppTextStyles.labelBold.copyWith(fontSize: 13),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _usernameController,
                            style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                            decoration: const InputDecoration(
                              hintText: 'Nhập SE170245...',
                              prefixIcon: Icon(Icons.badge_outlined, color: AppColors.primaryLight, size: 20),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Text(
                            'Mật khẩu',
                            style: AppTextStyles.labelBold.copyWith(fontSize: 13),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                            decoration: InputDecoration(
                              hintText: 'Nhập mật khẩu...',
                              prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppColors.primaryLight, size: 20),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                  color: AppColors.textMuted,
                                  size: 20,
                                ),
                                onPressed: () {
                                  setState(() => _obscurePassword = !_obscurePassword);
                                },
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () {},
                              style: TextButton.styleFrom(padding: EdgeInsets.zero),
                              child: Text(
                                'Quên mật khẩu?',
                                style: AppTextStyles.bodySm.copyWith(
                                  color: AppColors.secondaryLight,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Login Button
                          PrimaryButton(
                            text: 'Đăng nhập vào phòng thi',
                            icon: Icons.login_rounded,
                            isLoading: auth.isLoading,
                            onPressed: _handleLogin,
                          ),
                          const SizedBox(height: 12),

                          // Biometrics / Quick Demo Login
                          Center(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                _usernameController.text = 'SE170245';
                                _handleLogin();
                              },
                              icon: const Icon(Icons.fingerprint_rounded, size: 22, color: AppColors.tertiary),
                              label: Text(
                                'Đăng nhập nhanh với FaceID / Sinh trắc học',
                                style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.borderGlass),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // University Branding Footer
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.school_outlined, size: 16, color: AppColors.textMuted),
                        const SizedBox(width: 6),
                        Text(
                          'FPT University • AI Viva Exam Core v1.0',
                          style: AppTextStyles.bodySm.copyWith(color: AppColors.textDisabled),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
