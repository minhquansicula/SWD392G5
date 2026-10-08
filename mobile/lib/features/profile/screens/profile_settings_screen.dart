import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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
  bool _examNotificationEnabled = true;

  void _showRegulationDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.menu_book_rounded, color: AppColors.primaryLight, size: 24),
            const SizedBox(width: 8),
            Text('Quy Chế Thi Vấn Đáp', style: AppTextStyles.headlineMd.copyWith(fontSize: 18)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('1. Thí sinh chuẩn bị không gian yên tĩnh, trang phục nghiêm túc.', style: AppTextStyles.bodySm),
              const SizedBox(height: 8),
              Text('2. Giữ micro và kết nối mạng ổn định trong suốt buổi vấn đáp.', style: AppTextStyles.bodySm),
              const SizedBox(height: 8),
              Text('3. Điểm số do AI chấm là điểm đề xuất. Giảng viên phụ trách sẽ nghe lại ghi âm để chốt điểm chính thức.', style: AppTextStyles.bodySm),
              const SizedBox(height: 8),
              Text('4. Kết quả thi sẽ hiển thị trong mục "Lịch thi & Kết quả" sau khi được giảng viên phê duyệt.', style: AppTextStyles.bodySm),
            ],
          ),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Đã hiểu'),
          ),
        ],
      ),
    );
  }

  void _testMicrophone() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.successDark,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        content: Row(
          children: const [
            Icon(Icons.mic_rounded, color: Colors.white, size: 20),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Microphone hoạt động tốt! Định dạng thu âm 16kHz PCM đã sẵn sàng.',
                style: TextStyle(color: Colors.white, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.currentUser;

    final displayName = user?.fullName.isNotEmpty == true ? user!.fullName : 'Nguyễn Minh Hoàng';
    final userCode = user?.userCode.isNotEmpty == true ? user!.userCode : 'SE170245';
    final userEmail = user?.email.isNotEmpty == true && user!.email.contains('@')
        ? user.email
        : '${userCode.toLowerCase()}@fpt.edu.vn';
    final department = user?.department.isNotEmpty == true
        ? user!.department
        : 'Kỹ thuật Phần mềm (FIT Dept)';
    final initialLetter = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'S';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Hồ Sơ Sinh Viên', style: AppTextStyles.headlineMd),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Student Profile Identity Card
            GlassCard(
              padding: const EdgeInsets.all(20),
              borderRadius: 22,
              border: Border.all(color: AppColors.borderGlow),
              child: Row(
                children: [
                  Container(
                    width: 62,
                    height: 62,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: AppColors.primaryGradient,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.4),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                    ),
                    child: Center(
                      child: Text(
                        initialLetter,
                        style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          style: AppTextStyles.headlineMd.copyWith(fontSize: 18),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'MSSV: $userCode',
                          style: AppTextStyles.labelBold.copyWith(
                            color: AppColors.primaryLight,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          department,
                          style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  const StatusBadge(
                    label: 'CHÍNH QUY',
                    type: BadgeType.success,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Academic & Survey Information Section
            Text('Thông Tin Học Vụ & Khảo Thí', style: AppTextStyles.titleMd),
            const SizedBox(height: 10),
            GlassCard(
              padding: const EdgeInsets.all(16),
              borderRadius: 18,
              child: Column(
                children: [
                  _buildInfoRow(
                    icon: Icons.alternate_email_rounded,
                    iconColor: AppColors.secondaryLight,
                    label: 'Email FPT',
                    value: userEmail,
                  ),
                  const Divider(color: AppColors.borderGlass),
                  _buildInfoRow(
                    icon: Icons.school_rounded,
                    iconColor: AppColors.primaryLight,
                    label: 'Học kỳ hiện tại',
                    value: user?.semester ?? 'Fall 2026',
                  ),
                  const Divider(color: AppColors.borderGlass),
                  _buildInfoRow(
                    icon: Icons.location_city_rounded,
                    iconColor: AppColors.tertiary,
                    label: 'Cơ sở đào tạo',
                    value: 'FPT University • Campus Hòa Lạc',
                  ),
                  const Divider(color: AppColors.borderGlass),
                  _buildInfoRow(
                    icon: Icons.verified_user_rounded,
                    iconColor: AppColors.success,
                    label: 'Trạng thái học tập',
                    value: 'Đang theo học (Active)',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // App Settings & Testing Section
            Text('Tiện Ích & Cài Đặt', style: AppTextStyles.titleMd),
            const SizedBox(height: 10),
            GlassCard(
              padding: const EdgeInsets.all(16),
              borderRadius: 18,
              child: Column(
                children: [
                  // Dark Mode Indicator
                  Row(
                    children: [
                      const Icon(Icons.dark_mode_rounded, size: 20, color: AppColors.primaryLight),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Giao diện tối chuyên dụng',
                          style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceCardHigh,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.borderGlass),
                        ),
                        child: Text('AI Dark', style: AppTextStyles.labelSm.copyWith(color: AppColors.textMuted)),
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.borderGlass),
                  // Exam Reminder Notification Toggle
                  Row(
                    children: [
                      const Icon(Icons.notifications_active_outlined, size: 20, color: AppColors.warning),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Nhắc lịch thi vấn đáp',
                              style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                            ),
                            Text(
                              'Thông báo trước giờ thi 15 phút',
                              style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _examNotificationEnabled,
                        activeThumbColor: AppColors.primary,
                        onChanged: (val) {
                          setState(() => _examNotificationEnabled = val);
                        },
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.borderGlass),
                  // Test Microphone Button
                  InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: _testMicrophone,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.mic_none_rounded, size: 20, color: AppColors.tertiary),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Kiểm tra Microphone thiết bị',
                                  style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                                ),
                                Text(
                                  'Đảm bảo micro thu âm rõ trước khi vào thi',
                                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Regulations & Support Section
            Text('Quy Chế & Hỗ Trợ', style: AppTextStyles.titleMd),
            const SizedBox(height: 10),
            GlassCard(
              padding: const EdgeInsets.all(16),
              borderRadius: 18,
              child: Column(
                children: [
                  InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: _showRegulationDialog,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.menu_book_rounded, size: 20, color: AppColors.primaryLight),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Quy chế thi Vấn đáp trực tuyến',
                              style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                        ],
                      ),
                    ),
                  ),
                  const Divider(color: AppColors.borderGlass),
                  InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Hotline Khảo thí FPT: (024) 7300 1866 • Email: khaothi@fpt.edu.vn'),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.support_agent_rounded, size: 20, color: AppColors.secondaryLight),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Liên hệ Phòng Khảo Thí & Đảm Bảo Chất Lượng',
                              style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                        ],
                      ),
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

  Widget _buildInfoRow({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: iconColor),
          const SizedBox(width: 12),
          Text(label, style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted)),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.bodySm.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
