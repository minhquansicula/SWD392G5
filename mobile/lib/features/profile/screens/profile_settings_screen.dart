import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/app_content.dart';
import '../../auth/providers/auth_provider.dart';
import '../../viva_session/services/audio_recorder_service.dart';
import '../../auth/screens/forgot_password_screen.dart';

class ProfileSettingsScreen extends StatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  bool _testingMic = false;

  void _showRegulationDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Quy chế thi vấn đáp'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '1. Thí sinh chuẩn bị không gian yên tĩnh, trang phục nghiêm túc.',
                style: AppTextStyles.bodySm,
              ),
              const SizedBox(height: 8),
              Text(
                '2. Giữ micro và kết nối mạng ổn định trong suốt buổi vấn đáp.',
                style: AppTextStyles.bodySm,
              ),
              const SizedBox(height: 8),
              Text(
                '3. Điểm số do AI chấm là điểm đề xuất. Giảng viên phụ trách sẽ nghe lại ghi âm để chốt điểm chính thức.',
                style: AppTextStyles.bodySm,
              ),
              const SizedBox(height: 8),
              Text(
                '4. Kết quả thi sẽ hiển thị trong mục "Lịch thi & Kết quả" sau khi được giảng viên phê duyệt.',
                style: AppTextStyles.bodySm,
              ),
            ],
          ),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Đã hiểu'),
          ),
        ],
      ),
    );
  }

  Future<void> _testMicrophone() async {
    if (_testingMic) return;
    setState(() => _testingMic = true);
    final recorder = AudioRecorderService();
    bool working = false;
    try {
      if (await recorder.init()) {
        await recorder.startRecording();
        working = await recorder.audioChunkStream.first
            .timeout(const Duration(seconds: 3))
            .then((chunk) => chunk.isNotEmpty);
      }
    } catch (_) {
      working = false;
    } finally {
      await recorder.dispose();
      if (mounted) setState(() => _testingMic = false);
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.successDark,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        content: Row(
          children: [
            const Icon(Icons.mic_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                working
                    ? 'Đã nhận được âm thanh từ microphone.'
                    : 'Chưa nhận được âm thanh. Kiểm tra quyền microphone và thử lại.',
                style: const TextStyle(color: Colors.white, fontSize: 13),
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
    return Scaffold(
      appBar: AppBar(title: const Text('Tài khoản')),
      body: SafeArea(
        child: AppContent(
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 16),
            children: [
              Text(
                user?.fullName ?? 'Sinh viên',
                style: AppTextStyles.headlineLg,
              ),
              const SizedBox(height: 8),
              Text(user?.email ?? 'Chưa có email', style: AppTextStyles.bodyMd),
              const SizedBox(height: 24),
              Text('Thông tin cá nhân', style: AppTextStyles.headlineMd),
              const SizedBox(height: 12),
              GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _info('Mã sinh viên', user?.userCode ?? 'Chưa cập nhật'),
                    const Divider(),
                    _info('Ngành học', user?.department ?? 'Chưa cập nhật'),
                    const Divider(),
                    _info('Học kỳ', user?.semester ?? 'Chưa cập nhật'),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text('Bảo mật', style: AppTextStyles.headlineMd),
              const SizedBox(height: 12),
              PrimaryButton(
                text: 'Đổi mật khẩu',
                icon: Icons.lock_reset,
                isOutlined: true,
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => ForgotPasswordScreen(
                      prefilledEmail: user?.email,
                      isFromProfile: true,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text('Thiết bị và hướng dẫn', style: AppTextStyles.headlineMd),
              const SizedBox(height: 12),
              PrimaryButton(
                text: 'Kiểm tra microphone',
                icon: Icons.mic_outlined,
                isOutlined: true,
                isLoading: _testingMic,
                onPressed: _testMicrophone,
              ),
              const SizedBox(height: 12),
              PrimaryButton(
                text: 'Quy chế thi vấn đáp',
                icon: Icons.menu_book_outlined,
                isOutlined: true,
                onPressed: _showRegulationDialog,
              ),
              const SizedBox(height: 16),
              const AppMessage(
                message:
                    'Nhắc lịch tự động chưa được hỗ trợ. Bạn có thể xem và cập nhật lịch thi trong tab Lịch thi.',
              ),
              const SizedBox(height: 24),
              PrimaryButton(
                text: 'Đăng xuất',
                icon: Icons.logout,
                isOutlined: true,
                onPressed: auth.logout,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _info(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.bodySm),
        const SizedBox(height: 4),
        Text(value, style: AppTextStyles.bodyMd),
      ],
    ),
  );
}
