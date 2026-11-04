import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_content.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_badge.dart';
import '../../exam/models/exam_schedule_model.dart';
import '../../exam/providers/exam_provider.dart';
import '../../home/screens/main_navigation_screen.dart';
import '../models/viva_report_model.dart';
import '../providers/report_provider.dart';

class ExamResultReportScreen extends StatefulWidget {
  final ExamScheduleModel? exam;
  final bool autoLoad;
  const ExamResultReportScreen({super.key, this.exam, this.autoLoad = true});
  @override
  State<ExamResultReportScreen> createState() => _ExamResultReportScreenState();
}

class _ExamResultReportScreenState extends State<ExamResultReportScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.autoLoad && widget.exam != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          context.read<ReportProvider>().fetchReportForExam(widget.exam!.id);
        }
      });
    }
  }

  void _home() => Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
    (route) => false,
  );
  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ReportProvider>();
    final selected = provider.schedule?.id == widget.exam?.id
        ? provider.schedule
        : widget.exam;
    final latest = provider.latestReport;
    final report =
        (widget.exam == null || latest?.id == widget.exam!.id
            ? latest
            : null) ??
        (selected != null &&
                selected.status == ExamStatus.completed &&
                selected.finalScore != null
            ? VivaReportModel.fromExam(selected)
            : null);
    final exams = context.read<ExamProvider?>();
    return PopScope(
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) exams?.refreshExams();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(report == null ? 'Trạng Thái Điểm Số' : 'Kết quả thi'),
          leading: IconButton(
            tooltip: 'Quay lại',
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              } else {
                _home();
              }
            },
          ),
          actions: [
            if (widget.exam != null)
              IconButton(
                tooltip: 'Tải lại kết quả',
                icon: const Icon(Icons.refresh),
                onPressed: provider.isLoading
                    ? null
                    : () => provider.fetchReportForExam(widget.exam!.id),
              ),
          ],
        ),
        body: SafeArea(
          child: AppContent(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 16),
              children: [
                if (provider.isLoading) const LinearProgressIndicator(),
                if (provider.errorMessage != null) ...[
                  AppMessage(message: provider.errorMessage!, isError: true),
                  const SizedBox(height: 16),
                ],
                if (report != null)
                  ..._report(report)
                else ...[
                  if (selected != null) ...[
                    Text(selected.examTitle, style: AppTextStyles.headlineLg),
                    const SizedBox(height: 8),
                    Text(selected.courseName, style: AppTextStyles.bodyMd),
                    const SizedBox(height: 16),
                    AppMessage(
                      message: switch (selected.status) {
                        ExamStatus.completed =>
                          'Ca thi đã hoàn tất. Điểm chính thức đang chờ giảng viên công bố.',
                        ExamStatus.inProgress =>
                          'Ca thi đang diễn ra. Kết quả sẽ được cập nhật sau khi hoàn tất.',
                        ExamStatus.upcoming =>
                          'Ca thi chưa bắt đầu. Chưa có kết quả đánh giá.',
                      },
                    ),
                  ] else
                    const AppMessage(
                      message: 'Chưa có báo cáo cho ca thi này.',
                    ),
                ],
                const SizedBox(height: 24),
                PrimaryButton(
                  text: 'Về Trang Chủ',
                  icon: Icons.home_outlined,
                  isOutlined: true,
                  onPressed: _home,
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _report(VivaReportModel report) => [
    GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            report.courseCode,
            style: AppTextStyles.labelBold.copyWith(
              color: AppColors.primaryLight,
            ),
          ),
          const SizedBox(height: 8),
          Text(report.examTitle, style: AppTextStyles.headlineLg),
          const SizedBox(height: 8),
          Text(report.courseName, style: AppTextStyles.bodyMd),
          const SizedBox(height: 8),
          Text(
            DateFormat('dd/MM/yyyy • HH:mm').format(report.examDate),
            style: AppTextStyles.bodySm,
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                report.totalScore.toStringAsFixed(1),
                style: AppTextStyles.headlineXl,
              ),
              Text(
                '/ ${report.maxScore.toStringAsFixed(0)}',
                style: AppTextStyles.bodyMd,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: StatusBadge(
              label: report.isPassed ? 'ĐẠT (PASSED)' : 'KHÔNG ĐẠT (FAILED)',
              type: report.isPassed ? BadgeType.success : BadgeType.danger,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Nguồn đánh giá: ${report.verifiedByLecturer}',
            style: AppTextStyles.bodySm,
          ),
        ],
      ),
    ),
    const SizedBox(height: 24),
    Text('Rubric AI tham khảo', style: AppTextStyles.headlineMd),
    const SizedBox(height: 8),
    const AppMessage(
      message:
          'Nhận xét và điểm từng câu của AI chỉ mang tính tham khảo. Điểm tổng chính thức do giảng viên công bố.',
    ),
    const SizedBox(height: 12),
    if (report.rubricCriteria.isEmpty)
      const AppMessage(message: 'Chưa có dữ liệu đánh giá chi tiết.')
    else
      GlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final criterion in report.rubricCriteria)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(criterion.title, style: AppTextStyles.labelBold),
                    const SizedBox(height: 8),
                    Text(
                      criterion.score == null
                          ? 'Chưa đánh giá'
                          : '${criterion.score!.toStringAsFixed(1)} / ${criterion.maxScore.toStringAsFixed(0)}',
                      style: AppTextStyles.bodyMd,
                    ),
                    if (criterion.score != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: LinearProgressIndicator(
                          value: criterion.percentage,
                          semanticsLabel: criterion.title,
                          minHeight: 6,
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    const SizedBox(height: 24),
    Text('Nhận xét AI', style: AppTextStyles.headlineMd),
    const SizedBox(height: 12),
    if (report.strengths.isEmpty && report.improvements.isEmpty)
      const AppMessage(message: 'Chưa có nhận xét được ghi nhận.')
    else
      GlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (report.strengths.isNotEmpty) ...[
              Text('Điểm mạnh', style: AppTextStyles.labelBold),
              const SizedBox(height: 8),
              ...report.strengths.map(
                (text) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(text, style: AppTextStyles.bodyMd),
                ),
              ),
            ],
            if (report.improvements.isNotEmpty) ...[
              Text('Cần cải thiện', style: AppTextStyles.labelBold),
              const SizedBox(height: 8),
              ...report.improvements.map(
                (text) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(text, style: AppTextStyles.bodyMd),
                ),
              ),
            ],
          ],
        ),
      ),
    const SizedBox(height: 24),
    Text('Chi tiết từng câu hỏi & đánh giá', style: AppTextStyles.headlineMd),
    const SizedBox(height: 12),
    if (report.questionReports.isEmpty)
      const AppMessage(message: 'Chưa tải được bản ghi câu hỏi và câu trả lời.')
    else
      ...report.questionReports.map(
        (question) => GlassCard(
          margin: const EdgeInsets.only(bottom: 14),
          padding: EdgeInsets.zero,
          child: Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              initiallyExpanded: true,
              tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              title: Row(
                children: [
                  Flexible(
                    child: StatusBadge(
                      label: 'Câu ${question.questionNumber}${question.isFollowUp ? " • Bổ sung" : ""}',
                      type: BadgeType.info,
                    ),
                  ),
                  const Spacer(),
                  if (question.lecturerScore != null)
                    StatusBadge(
                      label: 'GV: ${question.lecturerScore!.toStringAsFixed(1)} / ${question.maxScore.toStringAsFixed(0)}',
                      type: BadgeType.success,
                    )
                  else if (question.score != null)
                    StatusBadge(
                      label: 'AI: ${question.score!.toStringAsFixed(1)} / ${question.maxScore.toStringAsFixed(0)}',
                      type: BadgeType.warning,
                    ),
                ],
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  question.fullQuestion,
                  style: AppTextStyles.labelBold.copyWith(fontSize: 14),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                const Divider(color: AppColors.borderGlass),
                const SizedBox(height: 8),

                // 1. Toàn bộ câu hỏi
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Nội dung câu hỏi:',
                    style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary),
                  ),
                ),
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    question.fullQuestion,
                    style: AppTextStyles.bodyMd.copyWith(color: Colors.white, height: 1.45),
                  ),
                ),
                const SizedBox(height: 14),

                // 2. Câu trả lời của thí sinh
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Câu trả lời của bạn:',
                    style: AppTextStyles.labelSm.copyWith(color: AppColors.primaryLight),
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceCardHigh,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.borderGlass),
                  ),
                  child: Text(
                    question.studentAnswer.isEmpty
                        ? 'Chưa có câu trả lời được ghi nhận.'
                        : question.studentAnswer,
                    style: AppTextStyles.bodyMd.copyWith(height: 1.45),
                  ),
                ),
                const SizedBox(height: 14),

                // 3. Nhận xét của Giảng viên (Đánh giá chính thức)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: question.lecturerScore != null
                        ? AppColors.success.withValues(alpha: 0.08)
                        : AppColors.surfaceCard,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: question.lecturerScore != null
                          ? AppColors.success.withValues(alpha: 0.3)
                          : AppColors.borderGlass,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.school_outlined,
                            size: 18,
                            color: question.lecturerScore != null
                                ? AppColors.success
                                : AppColors.textSecondary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Đánh giá của Giảng viên',
                              style: AppTextStyles.labelBold.copyWith(
                                color: question.lecturerScore != null
                                    ? AppColors.success
                                    : AppColors.textSecondary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            question.lecturerScore != null
                                ? 'Điểm: ${question.lecturerScore!.toStringAsFixed(1)} / ${question.maxScore.toStringAsFixed(0)}'
                                : 'Chưa chấm điểm',
                            style: AppTextStyles.labelBold.copyWith(
                              color: question.lecturerScore != null
                                  ? AppColors.success
                                  : AppColors.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        (question.lecturerFeedback != null && question.lecturerFeedback!.trim().isNotEmpty)
                            ? question.lecturerFeedback!
                            : 'Giảng viên chưa để lại nhận xét riêng cho câu này.',
                        style: AppTextStyles.bodySm.copyWith(
                          color: (question.lecturerFeedback != null && question.lecturerFeedback!.trim().isNotEmpty)
                              ? Colors.white
                              : AppColors.textSecondary,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),

                // 4. Nhận xét & điểm tham khảo từ AI
                if (question.score != null || (question.aiFeedback != null && question.aiFeedback!.isNotEmpty)) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.borderGlass),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.smart_toy_outlined, size: 16, color: AppColors.primaryLight),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Gợi ý tham khảo từ Giám khảo AI',
                                style: AppTextStyles.labelSm.copyWith(color: AppColors.primaryLight),
                              ),
                            ),
                            if (question.score != null) ...[
                              const SizedBox(width: 8),
                              Text(
                                '${question.score!.toStringAsFixed(1)} / ${question.maxScore.toStringAsFixed(0)}',
                                style: AppTextStyles.labelSm.copyWith(
                                  color: AppColors.primaryLight,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ],
                        ),
                        if (question.aiFeedback != null && question.aiFeedback!.trim().isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            question.aiFeedback!,
                            style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary, height: 1.4),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
  ];
}
