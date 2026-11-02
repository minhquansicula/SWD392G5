import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../features/exam/models/exam_schedule_model.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'glass_card.dart';
import 'primary_button.dart';
import 'status_badge.dart';

class ExamCard extends StatelessWidget {
  final ExamScheduleModel exam;
  final VoidCallback onOpen;
  const ExamCard({super.key, required this.exam, required this.onOpen});
  @override
  Widget build(BuildContext context) {
    final completed = exam.status == ExamStatus.completed;
    final active = exam.status == ExamStatus.inProgress;
    final status = completed
        ? exam.finalScore != null
              ? 'Đã công bố điểm'
              : 'Chờ công bố điểm'
        : active
        ? 'Đang diễn ra'
        : 'Sắp diễn ra';
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              StatusBadge(label: exam.courseCode),
              StatusBadge(
                label: status,
                type: completed && exam.finalScore != null
                    ? BadgeType.success
                    : active
                    ? BadgeType.warning
                    : BadgeType.info,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(exam.examTitle, style: AppTextStyles.headlineMd),
          const SizedBox(height: 4),
          Text(exam.courseName, style: AppTextStyles.bodyMd),
          const SizedBox(height: 12),
          Text(
            DateFormat('dd/MM/yyyy • HH:mm').format(exam.scheduledAt),
            style: AppTextStyles.bodyMd,
          ),
          if (exam.scheduledEndAt != null)
            Text(
              'Kết thúc: ${DateFormat('dd/MM • HH:mm').format(exam.scheduledEndAt!)}',
              style: AppTextStyles.bodySm,
            ),
          if (completed && exam.finalScore != null) ...[
            const SizedBox(height: 12),
            Text(
              '${exam.finalScore!.toStringAsFixed(1)} / 10',
              style: AppTextStyles.headlineLg.copyWith(
                color: AppColors.primaryLight,
              ),
            ),
          ],
          const SizedBox(height: 16),
          PrimaryButton(
            text: completed
                ? 'Xem kết quả'
                : active
                ? 'Tiếp tục thi'
                : 'Xem chi tiết',
            icon: completed
                ? Icons.assignment_outlined
                : active
                ? Icons.mic_outlined
                : Icons.arrow_forward,
            isOutlined: !active,
            onPressed: onOpen,
          ),
        ],
      ),
    );
  }
}
