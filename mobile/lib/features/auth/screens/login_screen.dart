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
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    final auth = context.read<AuthProvider>();
    final success = await auth.login(
      email: _emailController.text,
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
          backgroundColor: AppColors.danger,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          content: Row(
            children: [
              const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(auth.errorMessage!, style: AppTextStyles.bodySm.copyWith(color: Colors.white))),
            ],
          ),
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
          // Ambient Neon Glowing Orbs Background (Theme matching Web FE)
          Positioned(
            top: -80,
            right: -60,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withValues(alpha: 0.22),
              ),
            ),
          ),
          Positioned(
            top: 240,
            left: -90,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.secondary.withValues(alpha: 0.18),
              ),
            ),
          ),
          Positioned(
            bottom: -60,
            right: -40,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.tertiary.withValues(alpha: 0.12),
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
                    // Center(
                    //   child: Container(
                    //     width: 76,
                    //     height: 76,
                    //     decoration: BoxDecoration(
                    //       gradient: AppColors.primaryGradient,
                    //       borderRadius: BorderRadius.circular(22),
                    //       boxShadow: [
                    //         BoxShadow(
                    //           color: AppColors.primary.withValues(alpha: 0.45),
                    //           blurRadius: 24,
                    //           offset: const Offset(0, 10),
                    //         ),
                    //       ],
                    //     ),
                    //     child: const Icon(
                    //       Icons.psychology_rounded,
                    //       size: 44,
                    //       color: Colors.white,
                    //     ),
                    //   ),
                    // ),
                    const SizedBox(height: 16),
                    Text(
                      'AIVES',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.headlineXl.copyWith(
                        letterSpacing: 2.0,
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Hệ Thống Khảo Thí Vấn Đáp AI',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.bodySm.copyWith(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Login Card
                    GlassCard(
                      padding: const EdgeInsets.all(22),
                      borderRadius: 22,
                      border: Border.all(color: AppColors.borderGlass),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Email FPT',
                            style: AppTextStyles.labelBold.copyWith(fontSize: 12),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                            decoration: const InputDecoration(
                              hintText: 'Nhập email FPT (VD: hoangnmse170245@fpt.edu.vn)...',
                              prefixIcon: Icon(Icons.email_outlined, color: AppColors.primaryLight, size: 20),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Mật khẩu',
                            style: AppTextStyles.labelBold.copyWith(fontSize: 12),
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
                          const SizedBox(height: 3),

                          // Remember me & Forgot Password
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              // GestureDetector(
                              //   onTap: () => setState(() => _rememberMe = !_rememberMe),
                              //   child: Row(
                              //     children: [
                              //       SizedBox(
                              //         width: 20,
                              //         height: 20,
                              //         child: Checkbox(
                              //           value: _rememberMe,
                              //           activeColor: AppColors.primary,
                              //           checkColor: Colors.white,
                              //           shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              //           side: const BorderSide(color: AppColors.borderGlass, width: 1.5),
                              //           onChanged: (v) => setState(() => _rememberMe = v ?? true),
                              //         ),
                              //       ),
                              //       const SizedBox(width: 8),
                              //       Text(
                              //         'Ghi nhớ đăng nhập',
                              //         style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                              //       ),
                              //     ],
                              //   ),
                              // ),
                              TextButton(
                                onPressed: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Vui lòng liên hệ Phòng Khảo thí FPT để cấp lại mật khẩu.')),
                                  );
                                },
                                style: TextButton.styleFrom(padding: EdgeInsets.zero),
                                child: Text(
                                  'Quên mật khẩu?',
                                  style: AppTextStyles.bodySm.copyWith(
                                    color: AppColors.secondaryLight,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Login Button
                          PrimaryButton(
                            text: 'Đăng nhập',
                            icon: Icons.login_rounded,
                            isLoading: auth.isLoading,
                            onPressed: _handleLogin,

                          ),
                          const SizedBox(height: 14),

                          // Quick Demo Student Button (1-tap login for easy testing)
                          // Container(
                          //   width: double.infinity,
                          //   decoration: BoxDecoration(
                          //     color: AppColors.surfaceCardHigh.withValues(alpha: 0.6),
                          //     borderRadius: BorderRadius.circular(14),
                          //     border: Border.all(color: AppColors.borderGlow),
                          //   ),
                          //   child: Material(
                          //     color: Colors.transparent,
                          //     child: InkWell(
                          //       borderRadius: BorderRadius.circular(14),
                          //       onTap: _handleQuickDemoLogin,
                          //       child: Padding(
                          //         padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                          //         child: Row(
                          //           mainAxisAlignment: MainAxisAlignment.center,
                          //           children: [
                          //             const Icon(Icons.flash_on_rounded, size: 18, color: AppColors.warning),
                          //             const SizedBox(width: 8),
                          //             Text(
                          //               'Đăng nhập nhanh mẫu (SE170245)',
                          //               style: AppTextStyles.labelBold.copyWith(
                          //                 color: Colors.white,
                          //                 fontSize: 13,
                          //               ),
                          //             ),
                          //           ],
                          //         ),
                          //       ),
                          //     ),
                          //   ),
                          // ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Lecturer / Admin notice
                    // Container(
                    //   padding: const EdgeInsets.all(12),
                    //   decoration: BoxDecoration(
                    //     color: AppColors.surfaceCardLow.withValues(alpha: 0.7),
                    //     borderRadius: BorderRadius.circular(14),
                    //     border: Border.all(color: AppColors.borderGlass),
                    //   ),
                    //   child: Row(
                    //     children: [
                    //       const Icon(Icons.info_outline_rounded, size: 18, color: AppColors.primaryLight),
                    //       const SizedBox(width: 10),
                    //       Expanded(
                    //         child: Text(
                    //           'Giảng viên & Admin vui lòng sử dụng Web Portal AIVES để quản lý ngân hàng câu hỏi & ca thi.',
                    //           style: AppTextStyles.bodySm.copyWith(
                    //             color: AppColors.textMuted,
                    //             fontSize: 11,
                    //             height: 1.3,
                    //           ),
                    //         ),
                    //       ),
                    //     ],
                    //   ),
                    // ),
                    const SizedBox(height: 24),

                    // University Branding Footer
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.school_outlined, size: 16, color: AppColors.textMuted),
                        const SizedBox(width: 6),
                        Text(
                          'FPT University • AIVES Mobile v1.0',
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
