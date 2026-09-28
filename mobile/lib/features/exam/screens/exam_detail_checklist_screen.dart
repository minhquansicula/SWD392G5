import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../models/exam_schedule_model.dart';
import '../../viva_session/screens/viva_room_screen.dart';

class ExamDetailChecklistScreen extends StatefulWidget {
  final ExamScheduleModel exam;

  const ExamDetailChecklistScreen({
    super.key,
    required this.exam,
  });

  @override
  State<ExamDetailChecklistScreen> createState() => _ExamDetailChecklistScreenState();
}

class _ExamDetailChecklistScreenState extends State<ExamDetailChecklistScreen> {
  bool _micChecked = true;
  bool _networkChecked = true;
  bool _idVerified = true;
  bool _rulesAgreed = true;

  @override
  Widget build(BuildContext context) {
    final canEnter = _micChecked && _networkChecked && _idVerified && _rulesAgreed;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Kiểm Tra Điều Kiện Dự Thi', style: AppTextStyles.headlineMd),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Course Info Card
            GlassCard(
              borderRadius: 20,
              backgroundColor: AppColors.surfaceCardLow,
              border: Border.all(color: AppColors.borderGlow),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      StatusBadge(
                        label: widget.exam.courseCode,
                        type: BadgeType.purple,
                        icon: Icons.code_rounded,
                      ),
                      const StatusBadge(
                        label: 'Phòng AI-04 Sẵn sàng',
                        type: BadgeType.success,
                        icon: Icons.fiber_manual_record_rounded,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.exam.courseName,
                    style: AppTextStyles.headlineLg,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.exam.examTitle,
                    style: AppTextStyles.bodyMd.copyWith(color: AppColors.secondaryLight),
                  ),
                  const SizedBox(height: 14),
                  const Divider(color: AppColors.borderGlass),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.access_time_rounded, size: 16, color: AppColors.warning),
                      const SizedBox(width: 6),
                      Text('Thời lượng: ${widget.exam.durationMinutes} phút', style: AppTextStyles.bodySm),
                      const Spacer(),
                      const Icon(Icons.quiz_outlined, size: 16, color: AppColors.primaryGlow),
                      const SizedBox(width: 6),
                      Text('${widget.exam.totalQuestions} câu hỏi chính', style: AppTextStyles.bodySm),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // AI Viva Notice Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.auto_awesome_rounded, color: AppColors.secondaryLight, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Cơ chế Giám khảo AI (AIVES Viva)',
                          style: AppTextStyles.labelBold.copyWith(color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Hệ thống AI sẽ đọc câu hỏi qua giọng nói. Bạn trả lời trực tiếp qua Micro bằng giọng nói. AI sẽ phân tích và có thể hỏi xoáy (adaptive follow-up) theo câu trả lời của bạn.',
                          style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Pre-Exam Checklist
            Text('Danh mục kiểm tra kỹ thuật (Checklist)', style: AppTextStyles.titleMd),
            const SizedBox(height: 12),

            _buildCheckItem(
              title: 'Microphone & Audio Streaming',
              subtitle: 'Đã cấp quyền thu âm Raw PCM 16kHz Mono',
              icon: Icons.mic_rounded,
              value: _micChecked,
              onChanged: (v) => setState(() => _micChecked = v!),
            ),
            _buildCheckItem(
              title: 'Kết nối WebSocket AI Core',
              subtitle: 'Độ trễ mạng 24ms • Băng thông ổn định',
              icon: Icons.wifi_rounded,
              value: _networkChecked,
              onChanged: (v) => setState(() => _networkChecked = v!),
            ),
            _buildCheckItem(
              title: 'Xác nhận danh tính thí sinh',
              subtitle: 'Nguyễn Minh Hoàng • MSSV: SE170245',
              icon: Icons.verified_user_rounded,
              value: _idVerified,
              onChanged: (v) => setState(() => _idVerified = v!),
            ),
            _buildCheckItem(
              title: 'Môi trường phòng thi yên tĩnh',
              subtitle: 'Tôi cam kết không có tiếng ồn và làm bài độc lập',
              icon: Icons.volume_off_rounded,
              value: _rulesAgreed,
              onChanged: (v) => setState(() => _rulesAgreed = v!),
            ),

            const SizedBox(height: 32),

            // Action Button
            PrimaryButton(
              text: 'Vào Phòng Thi AI Viva Ngay',
              icon: Icons.login_rounded,
              height: 52,
              onPressed: canEnter
                  ? () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => VivaRoomScreen(exam: widget.exam),
                        ),
                      );
                    }
                  : null,
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildCheckItem({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool?> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: value ? AppColors.success.withValues(alpha: 0.3) : AppColors.borderGlass,
        ),
      ),
      child: CheckboxListTile(
        value: value,
        onChanged: onChanged,
        activeColor: AppColors.success,
        checkColor: Colors.black,
        secondary: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: (value ? AppColors.success : AppColors.primary).withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: value ? AppColors.success : AppColors.primaryLight, size: 20),
        ),
        title: Text(title, style: AppTextStyles.labelBold),
        subtitle: Text(subtitle, style: AppTextStyles.bodySm),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      ),
    );
  }
}
