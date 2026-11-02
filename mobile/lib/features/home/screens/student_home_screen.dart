import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_content.dart';
import '../../../core/widgets/exam_card.dart';
import '../../exam/models/exam_schedule_model.dart';
import '../../exam/providers/exam_provider.dart';
import '../../exam/screens/exam_detail_checklist_screen.dart';
import '../../report/screens/exam_result_report_screen.dart';
import '../../auth/providers/auth_provider.dart';

class StudentHomeScreen extends StatefulWidget {
  const StudentHomeScreen({super.key});
  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final exams = context.read<ExamProvider>();
      if (exams.exams.isEmpty && !exams.isLoading) exams.refreshExams();
    });
  }

  void _open(ExamScheduleModel exam) => Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => exam.status == ExamStatus.completed
          ? ExamResultReportScreen(exam: exam)
          : ExamDetailChecklistScreen(exam: exam),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final exams = context.watch<ExamProvider>();
    final latest = exams.completedExams.firstOrNull;
    final hero = exams.activeHeroExam;
    return Scaffold(
      body: SafeArea(
        child: AppContent(
          child: RefreshIndicator(
            onRefresh: exams.refreshExams,
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 24),
              children: [
                Text(
                  'AIVES',
                  style: AppTextStyles.labelBold.copyWith(
                    color: AppColors.primaryLight,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Xin chào, ${user?.fullName ?? "bạn"}',
                  style: AppTextStyles.headlineLg,
                ),
                const SizedBox(height: 8),
                Text(
                  'Lịch thi và kết quả của bạn ở cùng một nơi.',
                  style: AppTextStyles.bodyMd,
                ),
                const SizedBox(height: 24),
                Text(
                  hero?.status == ExamStatus.inProgress
                      ? 'Ca thi đang diễn ra'
                      : 'Ca thi tiếp theo',
                  style: AppTextStyles.headlineMd,
                ),
                const SizedBox(height: 12),
                if (exams.isLoading && exams.exams.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (exams.errorMessage != null)
                  AppMessage(
                    message: exams.errorMessage!,
                    isError: true,
                    onRetry: exams.refreshExams,
                  )
                else if (hero != null)
                  ExamCard(exam: hero, onOpen: () => _open(hero))
                else
                  const AppMessage(
                    message:
                        'Bạn chưa có ca thi sắp tới. Kéo xuống để cập nhật lịch thi.',
                  ),
                const SizedBox(height: 24),
                Text('Kết quả gần nhất', style: AppTextStyles.headlineMd),
                const SizedBox(height: 12),
                if (latest != null)
                  ExamCard(exam: latest, onOpen: () => _open(latest))
                else
                  const AppMessage(
                    message:
                        'Chưa có kết quả thi vấn đáp. Kết quả sẽ xuất hiện sau khi bạn hoàn tất ca thi.',
                  ),
                const SizedBox(height: 24),
                Text('Chuẩn bị trước khi thi', style: AppTextStyles.headlineMd),
                const SizedBox(height: 12),
                const AppMessage(
                  message:
                      'Chọn nơi yên tĩnh, kiểm tra kết nối mạng và microphone. Mở chi tiết ca thi để kiểm tra điều kiện vào phòng.',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
