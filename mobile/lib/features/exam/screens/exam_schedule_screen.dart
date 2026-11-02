import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_content.dart';
import '../../../core/widgets/exam_card.dart';
import '../../exam/models/exam_schedule_model.dart';
import '../../exam/providers/exam_provider.dart';
import 'exam_detail_checklist_screen.dart';
import '../../report/screens/exam_result_report_screen.dart';

class ExamScheduleScreen extends StatefulWidget {
  const ExamScheduleScreen({super.key});
  @override
  State<ExamScheduleScreen> createState() => _ExamScheduleScreenState();
}

class _ExamScheduleScreenState extends State<ExamScheduleScreen> {
  int _filter = 0;
  static const _filters = [
    'Tất cả',
    'Sắp/đang thi',
    'Chờ công bố',
    'Đã có điểm',
  ];
  bool _matches(ExamScheduleModel exam) => switch (_filter) {
    1 => exam.status != ExamStatus.completed,
    2 => exam.status == ExamStatus.completed && exam.finalScore == null,
    3 => exam.status == ExamStatus.completed && exam.finalScore != null,
    _ => true,
  };
  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ExamProvider>();
    final exams = provider.exams.where(_matches).toList()
      ..sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));
    return Scaffold(
      body: SafeArea(
        child: AppContent(
          child: RefreshIndicator(
            onRefresh: provider.refreshExams,
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 24),
              children: [
                Text('Lịch thi', style: AppTextStyles.headlineLg),
                const SizedBox(height: 8),
                Text(
                  'Theo dõi ca thi và điểm đã công bố.',
                  style: AppTextStyles.bodyMd,
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (var i = 0; i < _filters.length; i++)
                      ChoiceChip(
                        label: Text(_filters[i]),
                        selected: _filter == i,
                        onSelected: (_) => setState(() => _filter = i),
                      ),
                  ],
                ),
                const SizedBox(height: 24),
                if (provider.isLoading) const LinearProgressIndicator(),
                if (provider.errorMessage != null)
                  AppMessage(
                    message: provider.errorMessage!,
                    isError: true,
                    onRetry: provider.refreshExams,
                  )
                else if (!provider.isLoading && exams.isEmpty)
                  AppMessage(
                    message: _filter == 0
                        ? 'Bạn chưa có lịch thi.'
                        : 'Chưa có ca thi trong mục ${_filters[_filter].toLowerCase()}.',
                  )
                else
                  ...exams.map(
                    (exam) => ExamCard(
                      exam: exam,
                      onOpen: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => exam.status == ExamStatus.completed
                              ? ExamResultReportScreen(exam: exam)
                              : ExamDetailChecklistScreen(exam: exam),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
