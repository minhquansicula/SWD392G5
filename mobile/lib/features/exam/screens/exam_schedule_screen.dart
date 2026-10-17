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
import '../../report/screens/exam_result_report_screen.dart';

class ExamScheduleScreen extends StatefulWidget {
  const ExamScheduleScreen({super.key});

  @override
  State<ExamScheduleScreen> createState() => _ExamScheduleScreenState();
}

class _ExamScheduleScreenState extends State<ExamScheduleScreen> {
  // 0: Tất cả, 1: Sắp thi, 2: Chờ duyệt điểm, 3: Đã có điểm
  int _selectedFilter = 0;

  @override
  Widget build(BuildContext context) {
    final examProvider = context.watch<ExamProvider>();
    final allExams = examProvider.exams;

    final filteredExams = allExams.where((exam) {
      if (_selectedFilter == 1) {
        return exam.status == ExamStatus.upcoming;
      }
      if (_selectedFilter == 2) {
        return exam.status == ExamStatus.completed && exam.finalScore == null;
      }
      if (_selectedFilter == 3) {
        return exam.status == ExamStatus.completed && exam.finalScore != null;
      }
      return true;
    }).toList();

    final upcomingCount = allExams.where((e) => e.status == ExamStatus.upcoming).length;
    final pendingCount = allExams.where((e) => e.status == ExamStatus.completed && e.finalScore == null).length;
    final gradedCount = allExams.where((e) => e.status == ExamStatus.completed && e.finalScore != null).length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Lịch Thi & Kết Quả', style: AppTextStyles.headlineMd),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => examProvider.refreshExams(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs (Scrollable pills)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFilterTab(0, 'Tất cả (${allExams.length})'),
                const SizedBox(width: 8),
                _buildFilterTab(1, 'Sắp thi ($upcomingCount)'),
                const SizedBox(width: 8),
                _buildFilterTab(2, 'Chờ duyệt điểm ($pendingCount)'),
                const SizedBox(width: 8),
                _buildFilterTab(3, 'Đã có điểm ($gradedCount)'),
              ],
            ),
          ),
          const SizedBox(height: 6),

          // Exams List
          Expanded(
            child: filteredExams.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _selectedFilter == 3
                                ? Icons.verified_outlined
                                : (_selectedFilter == 2 ? Icons.hourglass_top_rounded : Icons.event_note_rounded),
                            size: 48,
                            color: AppColors.textDisabled,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _selectedFilter == 3
                                ? 'Chưa có ca thi nào được duyệt điểm chính thức'
                                : (_selectedFilter == 2
                                    ? 'Không có ca thi nào đang chờ giảng viên duyệt'
                                    : 'Không có kỳ thi nào trong danh mục này'),
                            textAlign: TextAlign.center,
                            style: AppTextStyles.bodyMd.copyWith(color: AppColors.textMuted),
                          ),
                        ],
                      ),
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
    final isGraded = exam.status == ExamStatus.completed && exam.finalScore != null;
    final isPendingReview = exam.status == ExamStatus.completed && exam.finalScore == null;
    final dateStr = DateFormat('dd/MM/yyyy • HH:mm').format(exam.scheduledAt);

    return GlassCard(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      onTap: () {
        if (isGraded || isPendingReview) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ExamResultReportScreen(exam: exam),
            ),
          );
        } else {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ExamDetailChecklistScreen(exam: exam),
            ),
          );
        }
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
              if (isUpcoming)
                const StatusBadge(
                  label: 'Sắp diễn ra',
                  type: BadgeType.warning,
                  icon: Icons.schedule_rounded,
                )
              else if (isGraded)
                const StatusBadge(
                  label: 'Đã duyệt điểm',
                  type: BadgeType.success,
                  icon: Icons.verified_rounded,
                )
              else
                const StatusBadge(
                  label: 'Chờ GV duyệt',
                  type: BadgeType.warning,
                  icon: Icons.hourglass_top_rounded,
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

          // Date & Room info
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

          // Action Row based on status
          const SizedBox(height: 12),
          if (isUpcoming) ...[
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
          ] else if (isGraded) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.surfaceCardHigh,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Điểm chính thức:', style: AppTextStyles.labelSm.copyWith(color: AppColors.textMuted)),
                      const SizedBox(height: 2),
                      Text(
                        '${exam.finalScore} / 10',
                        style: AppTextStyles.headlineMd.copyWith(
                          color: AppColors.secondaryLight,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ExamResultReportScreen(exam: exam),
                        ),
                      );
                    },
                    icon: const Icon(Icons.analytics_outlined, size: 16),
                    label: const Text('Xem nhận xét & Rubric', style: TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.secondary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            // Completed but waiting for lecturer approval
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.hourglass_top_rounded, size: 18, color: AppColors.warning),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Đã thi xong. Giảng viên đang xem lại ghi âm và chốt điểm chính thức.',
                      style: AppTextStyles.bodySm.copyWith(color: AppColors.warning, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
