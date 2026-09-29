import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../models/exam_schedule_model.dart';
import '../providers/exam_provider.dart';
import 'exam_detail_checklist_screen.dart';

class ExamScheduleScreen extends StatefulWidget {
  const ExamScheduleScreen({super.key});

  @override
  State<ExamScheduleScreen> createState() => _ExamScheduleScreenState();
}

class _ExamScheduleScreenState extends State<ExamScheduleScreen> {
  int _selectedFilter = 0; // 0: Tất cả, 1: Sắp diễn ra, 2: Đã hoàn thành

  @override
  Widget build(BuildContext context) {
    final examProvider = context.watch<ExamProvider>();
    final allExams = examProvider.exams;

    final filteredExams = allExams.where((exam) {
      if (_selectedFilter == 1) return exam.status == ExamStatus.upcoming;
      if (_selectedFilter == 2) return exam.status == ExamStatus.completed;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Lịch Thi Vấn Đáp', style: AppTextStyles.headlineMd),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => examProvider.refreshExams(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                _buildFilterTab(0, 'Tất cả (${allExams.length})'),
                const SizedBox(width: 8),
                _buildFilterTab(1, 'Sắp thi'),
                const SizedBox(width: 8),
                _buildFilterTab(2, 'Đã xong'),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Exams List
          Expanded(
            child: filteredExams.isEmpty
                ? Center(
                    child: Text(
                      'Không có kỳ thi nào trong danh mục này',
                      style: AppTextStyles.bodyMd.copyWith(color: AppColors.textMuted),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    itemCount: filteredExams.length,
                    itemBuilder: (context, index) {
                      final exam = filteredExams[index];
                      return _buildExamCard(exam);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterTab(int index, String title) {
    final isSelected = _selectedFilter == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surfaceCardLow,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primaryLight : AppColors.borderGlass,
          ),
        ),
        child: Text(
          title,
          style: AppTextStyles.labelBold.copyWith(
            fontSize: 12,
            color: isSelected ? Colors.white : AppColors.textMuted,
          ),
        ),
      ),
    );
  }

  Widget _buildExamCard(ExamScheduleModel exam) {
    final isUpcoming = exam.status == ExamStatus.upcoming;
    final dateStr = DateFormat('dd/MM/yyyy • HH:mm').format(exam.scheduledAt);

    return GlassCard(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ExamDetailChecklistScreen(exam: exam),
          ),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  exam.courseCode,
                  style: AppTextStyles.labelBold.copyWith(color: AppColors.primaryLight),
                ),
              ),
              StatusBadge(
                label: isUpcoming ? 'Sắp diễn ra' : 'Đã hoàn thành',
                type: isUpcoming ? BadgeType.warning : BadgeType.success,
                icon: isUpcoming ? Icons.schedule_rounded : Icons.check_circle_rounded,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(exam.courseName, style: AppTextStyles.headlineMd.copyWith(fontSize: 17)),
          const SizedBox(height: 4),
          Text(exam.examTitle, style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: 12),
          const Divider(color: AppColors.borderGlass),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.meeting_room_outlined, size: 16, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Expanded(
                child: Text(exam.room, style: AppTextStyles.bodySm, overflow: TextOverflow.ellipsis),
              ),
              const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Text(dateStr, style: AppTextStyles.bodySm),
            ],
          ),
          if (isUpcoming) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 38,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ExamDetailChecklistScreen(exam: exam),
                    ),
                  );
                },
                icon: const Icon(Icons.mic_none_rounded, size: 18),
                label: const Text('Xem điều kiện & Vào thi', style: TextStyle(fontSize: 13)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
