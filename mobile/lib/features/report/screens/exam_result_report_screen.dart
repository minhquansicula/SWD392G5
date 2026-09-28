import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_badge.dart';
import '../../exam/models/exam_schedule_model.dart';
import '../models/viva_report_model.dart';
import '../providers/report_provider.dart';
import '../../home/screens/main_navigation_screen.dart';

class ExamResultReportScreen extends StatefulWidget {
  final ExamScheduleModel? exam;

  const ExamResultReportScreen({
    super.key,
    this.exam,
  });

  @override
  State<ExamResultReportScreen> createState() => _ExamResultReportScreenState();
}

class _ExamResultReportScreenState extends State<ExamResultReportScreen> {
  int? _expandedQuestionIndex;

  @override
  Widget build(BuildContext context) {
    final report = context.watch<ReportProvider>().latestReport ?? VivaReportModel.getSampleReport();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Báo Cáo Đánh Giá Viva', style: AppTextStyles.headlineMd),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const MainNavigationScreen(initialIndex: 2)),
              (route) => false,
            );
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, size: 20),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Đang chuẩn bị liên kết chia sẻ bảng điểm...')),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Score Summary Hero Card
            _buildScoreHeroCard(report),
            const SizedBox(height: 20),

            // Rubric Criteria Section
            _buildRubricSection(report),
            const SizedBox(height: 20),

            // AI Examiner Feedback Section
            _buildAiFeedbackSection(report),
            const SizedBox(height: 20),

            // Questions & Transcripts Breakdown Section
            _buildQuestionsSection(report),
            const SizedBox(height: 28),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: PrimaryButton(
                    text: 'Tải Báo Cáo PDF',
                    icon: Icons.download_rounded,
                    isOutlined: true,
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          backgroundColor: AppColors.successDark,
                          content: Text('Đã xuất file AIVES_SWD392_Report.pdf về máy'),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: PrimaryButton(
                    text: 'Về Trang Chủ',
                    icon: Icons.home_rounded,
                    onPressed: () {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
                        (route) => false,
                      );
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildScoreHeroCard(VivaReportModel report) {
    return GlassCard(
      padding: const EdgeInsets.all(22),
      borderRadius: 22,
      border: Border.all(color: AppColors.borderGlow),
      child: Column(
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
                  report.courseCode,
                  style: AppTextStyles.labelBold.copyWith(color: AppColors.primaryLight),
                ),
              ),
              const StatusBadge(
                label: 'Xác thực bởi AIVES AI',
                type: BadgeType.success,
                icon: Icons.verified_user_rounded,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            report.courseName,
            style: AppTextStyles.headlineLg,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            '${report.examTitle} • 24/10/2026',
            style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
          ),
          const SizedBox(height: 20),

          // Big Score Display
          Container(
            width: 130,
            height: 130,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.primary.withValues(alpha: 0.25),
                  AppColors.secondary.withValues(alpha: 0.05),
                ],
              ),
              border: Border.all(color: AppColors.primaryLight, width: 3),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.35),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Tổng điểm',
                  style: AppTextStyles.labelSm.copyWith(color: AppColors.textMuted),
                ),
                Text(
                  report.totalScore.toStringAsFixed(1),
                  style: AppTextStyles.headlineXl.copyWith(
                    fontSize: 38,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                Text(
                  '/10',
                  style: AppTextStyles.labelBold.copyWith(color: AppColors.primaryGlow, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Status & Rank
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const StatusBadge(
                label: 'ĐẠT (PASSED)',
                type: BadgeType.success,
                icon: Icons.check_circle_rounded,
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCardHigh,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  report.gradeRank,
                  style: AppTextStyles.labelSm.copyWith(color: Colors.white70),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            'Giảng viên chấm chốt: ${report.verifiedByLecturer}',
            style: AppTextStyles.bodySm.copyWith(color: AppColors.textDisabled, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildRubricSection(VivaReportModel report) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Điểm thành phần theo Rubric', style: AppTextStyles.titleMd),
            Text('${report.rubricCriteria.length} Tiêu chí', style: AppTextStyles.bodySm),
          ],
        ),
        const SizedBox(height: 12),
        GlassCard(
          padding: const EdgeInsets.all(16),
          borderRadius: 18,
          child: Column(
            children: report.rubricCriteria.map((c) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          c.title,
                          style: AppTextStyles.labelBold.copyWith(fontSize: 13),
                        ),
                        Text(
                          '${c.score.toStringAsFixed(1)} / 10',
                          style: AppTextStyles.labelBold.copyWith(color: AppColors.primaryLight),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: c.percentage,
                        minHeight: 8,
                        backgroundColor: AppColors.surfaceCardHigh,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          c.score >= 8.5
                              ? AppColors.success
                              : c.score >= 7.0
                                  ? AppColors.primaryLight
                                  : AppColors.warning,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildAiFeedbackSection(VivaReportModel report) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.auto_awesome_rounded, color: AppColors.secondaryLight, size: 20),
            const SizedBox(width: 8),
            Text('Nhận xét chi tiết từ AI Examiner', style: AppTextStyles.titleMd),
          ],
        ),
        const SizedBox(height: 12),
        GlassCard(
          padding: const EdgeInsets.all(16),
          borderRadius: 18,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Strengths
              Row(
                children: [
                  const Icon(Icons.verified_rounded, color: AppColors.success, size: 18),
                  const SizedBox(width: 6),
                  Text('Điểm mạnh', style: AppTextStyles.labelBold.copyWith(color: AppColors.success)),
                ],
              ),
              const SizedBox(height: 8),
              ...report.strengths.map(
                (s) => Padding(
                  padding: const EdgeInsets.only(left: 8, bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold)),
                      Expanded(child: Text(s, style: AppTextStyles.bodyMd)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Divider(color: AppColors.borderGlass),
              const SizedBox(height: 10),

              // Improvements
              Row(
                children: [
                  const Icon(Icons.lightbulb_outline_rounded, color: AppColors.warning, size: 18),
                  const SizedBox(width: 6),
                  Text('Cần cải thiện', style: AppTextStyles.labelBold.copyWith(color: AppColors.warning)),
                ],
              ),
              const SizedBox(height: 8),
              ...report.improvements.map(
                (imp) => Padding(
                  padding: const EdgeInsets.only(left: 8, bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold)),
                      Expanded(child: Text(imp, style: AppTextStyles.bodyMd)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuestionsSection(VivaReportModel report) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Phân tích câu hỏi vấn đáp', style: AppTextStyles.titleMd),
            Text('${report.questionReports.length} câu hỏi', style: AppTextStyles.bodySm),
          ],
        ),
        const SizedBox(height: 12),
        ...List.generate(report.questionReports.length, (index) {
          final q = report.questionReports[index];
          final isExpanded = _expandedQuestionIndex == index;

          return GlassCard(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            borderRadius: 16,
            onTap: () {
              setState(() {
                _expandedQuestionIndex = isExpanded ? null : index;
              });
            },
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: q.isFollowUp ? AppColors.secondary.withValues(alpha: 0.2) : AppColors.primary.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${index + 1}',
                          style: AppTextStyles.labelBold.copyWith(
                            color: q.isFollowUp ? AppColors.secondaryLight : AppColors.primaryLight,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(q.title, style: AppTextStyles.labelBold),
                          Text('Mức độ: ${q.bloomLevel}', style: AppTextStyles.bodySm),
                        ],
                      ),
                    ),
                    Text(
                      '${q.score}/${q.maxScore}',
                      style: AppTextStyles.labelBold.copyWith(color: AppColors.success),
                    ),
                    const SizedBox(width: 6),
                    Icon(
                      isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                      color: AppColors.textMuted,
                      size: 20,
                    ),
                  ],
                ),
                if (isExpanded) ...[
                  const SizedBox(height: 12),
                  const Divider(color: AppColors.borderGlass),
                  const SizedBox(height: 8),
                  Text('Câu hỏi AI đặt:', style: AppTextStyles.labelSm.copyWith(color: AppColors.secondaryLight)),
                  const SizedBox(height: 4),
                  Text(q.fullQuestion, style: AppTextStyles.bodyMd),
                  const SizedBox(height: 10),
                  Text('Câu trả lời của bạn:', style: AppTextStyles.labelSm.copyWith(color: AppColors.tertiary)),
                  const SizedBox(height: 4),
                  Text(q.studentAnswer, style: AppTextStyles.bodyMd.copyWith(color: Colors.white70)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceCardHigh,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.play_arrow_rounded, size: 16, color: AppColors.secondaryLight),
                            const SizedBox(width: 4),
                            Text('Nghe lại âm thanh • ${q.audioDuration}', style: AppTextStyles.bodySm),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          );
        }),
      ],
    );
  }
}
