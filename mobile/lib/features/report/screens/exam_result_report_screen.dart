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
    Text('Câu hỏi và câu trả lời', style: AppTextStyles.headlineMd),
    const SizedBox(height: 12),
    if (report.questionReports.isEmpty)
      const AppMessage(message: 'Chưa tải được bản ghi câu hỏi và câu trả lời.')
    else
      ...report.questionReports.map(
        (question) => GlassCard(
          margin: const EdgeInsets.only(bottom: 12),
          padding: EdgeInsets.zero,
          child: ExpansionTile(
            title: Text(
              'Câu ${question.questionNumber}${question.isFollowUp ? " · Bổ sung" : ""}',
              style: AppTextStyles.labelBold,
            ),
            subtitle: Text(question.title, style: AppTextStyles.bodyMd),
            childrenPadding: const EdgeInsets.all(16),
            children: [
              Text(question.fullQuestion, style: AppTextStyles.bodyMd),
              const SizedBox(height: 16),
              Text(
                question.studentAnswer.isEmpty
                    ? 'Chưa có câu trả lời được ghi nhận.'
                    : question.studentAnswer,
                style: AppTextStyles.bodyMd,
              ),
              const SizedBox(height: 16),
              Text(
                question.score == null
                    ? 'Chưa đánh giá'
                    : 'AI tham khảo: ${question.score!.toStringAsFixed(1)} / ${question.maxScore}',
                style: AppTextStyles.bodyMd,
              ),
            ],
          ),
        ),
      ),
  ];
}
