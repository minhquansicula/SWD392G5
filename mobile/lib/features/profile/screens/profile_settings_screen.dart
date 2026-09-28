import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/login_screen.dart';

class ProfileSettingsScreen extends StatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  final _wsUrlController = TextEditingController(text: ApiEndpoints.defaultWebSocketUrl);
  final _backendUrlController = TextEditingController(text: ApiEndpoints.defaultBaseUrl);
  String _selectedLanguage = 'Tiếng Việt (Vi-VN)';

  @override
  void dispose() {
    _wsUrlController.dispose();
    _backendUrlController.dispose();
    super.dispose();
  }

  void _saveServerConfig() {
    ApiEndpoints.defaultWebSocketUrl = _wsUrlController.text.trim();
    ApiEndpoints.defaultBaseUrl = _backendUrlController.text.trim();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        backgroundColor: AppColors.successDark,
        content: Text('Đã cập nhật cấu hình WebSocket & Backend URL!'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Hồ Sơ & Cấu Hình', style: AppTextStyles.headlineMd),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Student Profile Card
            GlassCard(
              padding: const EdgeInsets.all(20),
              borderRadius: 20,
              child: Row(
                children: [
                  Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: AppColors.primaryGradient,
                      border: Border.all(color: AppColors.borderGlow, width: 2),
                    ),
                    child: const Center(
                      child: Text(
                        'H',
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.fullName ?? 'Nguyễn Minh Hoàng',
                          style: AppTextStyles.headlineMd.copyWith(fontSize: 17),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'MSSV: ${user?.userCode ?? 'SE170245'}',
                          style: AppTextStyles.bodySm.copyWith(color: AppColors.primaryLight, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.department ?? 'Kỹ thuật Phần mềm',
                          style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const StatusBadge(
                    label: 'STUDENT',
                    type: BadgeType.purple,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // AI & Speech Settings (Nhóm chức năng 7)
            Text('Cấu hình Giọng nói & AI (STT/TTS)', style: AppTextStyles.titleMd),
            const SizedBox(height: 12),
            GlassCard(
              padding: const EdgeInsets.all(16),
              borderRadius: 18,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.language_rounded, size: 20, color: AppColors.primaryLight),
                          SizedBox(width: 10),
                          Text('Ngôn ngữ Vấn đáp AI'),
                        ],
                      ),
                      DropdownButton<String>(
                        value: _selectedLanguage,
                        dropdownColor: AppColors.surfaceCardHigh,
                        underline: const SizedBox(),
                        style: AppTextStyles.bodySm.copyWith(color: Colors.white),
                        items: const [
                          DropdownMenuItem(value: 'Tiếng Việt (Vi-VN)', child: Text('Tiếng Việt (Vi-VN)')),
                          DropdownMenuItem(value: 'English (En-US)', child: Text('English (En-US)')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _selectedLanguage = v);
                        },
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.borderGlass),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.speed_rounded, size: 20, color: AppColors.tertiary),
                          SizedBox(width: 10),
                          Text('Định dạng âm thanh Micro'),
                        ],
                      ),
                      Text(
                        '16kHz PCM Mono',
                        style: AppTextStyles.codeOrTimer.copyWith(fontSize: 12, color: AppColors.tertiary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Backend & WebSocket Server Configuration
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Kết Nối Server (Backend & Python)', style: AppTextStyles.titleMd),
                TextButton(
                  onPressed: _saveServerConfig,
                  child: Text('Lưu cấu hình', style: AppTextStyles.labelBold.copyWith(color: AppColors.secondaryLight)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            GlassCard(
              padding: const EdgeInsets.all(16),
              borderRadius: 18,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('WebSocket Voice Streaming Endpoint', style: AppTextStyles.labelSm),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _wsUrlController,
                    style: AppTextStyles.bodySm.copyWith(color: Colors.white),
                    decoration: const InputDecoration(
                      hintText: 'ws://10.0.2.2:8000/ws/viva/stream',
                      prefixIcon: Icon(Icons.wifi_tethering_rounded, size: 18, color: AppColors.secondaryLight),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text('Java Spring Boot REST API Endpoint', style: AppTextStyles.labelSm),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _backendUrlController,
                    style: AppTextStyles.bodySm.copyWith(color: Colors.white),
                    decoration: const InputDecoration(
                      hintText: 'http://10.0.2.2:8080/api/v1',
                      prefixIcon: Icon(Icons.dns_outlined, size: 18, color: AppColors.primaryLight),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Logout Button
            PrimaryButton(
              text: 'Đăng Xuất Tài Khoản',
              icon: Icons.logout_rounded,
              isOutlined: true,
              onPressed: () {
                auth.logout();
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              },
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
