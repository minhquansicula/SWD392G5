import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../../exam/models/exam_schedule_model.dart';
import '../../exam/providers/exam_provider.dart';
import '../../exam/screens/exam_detail_checklist_screen.dart';
import '../../report/screens/exam_result_report_screen.dart';

class StudentHomeScreen extends StatefulWidget {
  const StudentHomeScreen({super.key});

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> {
  @override
  void initState() {
    super.initState();
    // Tự động tải lịch thi ngay khi mở app
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final examProv = context.read<ExamProvider>();
      if (examProv.exams.isEmpty && !examProv.isLoading) {
        examProv.refreshExams();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final examProvider = context.watch<ExamProvider>();
    final heroExam = examProvider.activeHeroExam;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primaryLight,
          backgroundColor: AppColors.surfaceCard,
          onRefresh: () => context.read<ExamProvider>().refreshExams(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top User Header
              _buildTopHeader(user),
              const SizedBox(height: 20),

              // Hero Card: Upcoming Viva Exam (from Stitch design)
              _buildUpcomingExamHero(context, heroExam, examProvider),
              const SizedBox(height: 24),

              // Section: Học phần của bạn (Horizontal Carousel)
              _buildCourseModulesSection(context, examProvider.exams, examProvider.isLoading),
              const SizedBox(height: 24),

              // Section: Lịch sử điểm vấn đáp gần đây
              _buildRecentResultsSection(context, examProvider.completedExams),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    ),
  );
}

  Widget _buildTopHeader(dynamic user) {
    return Row(
      children: [
        // Avatar with online status
        Stack(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: AppColors.primaryGradient,
                border: Border.all(color: AppColors.borderGlow, width: 2),
              ),
              child: Center(
                child: Text(
                  user != null && user.fullName.isNotEmpty
                      ? user.fullName[0].toUpperCase()
                      : 'S',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: 13,
                height: 13,
                decoration: BoxDecoration(
                  color: AppColors.success,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.background, width: 2),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Chào ${user != null && user.fullName.isNotEmpty ? user.fullName : "bạn"}',
                      style: AppTextStyles.headlineMd.copyWith(fontSize: 16),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const SizedBox.shrink(),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                '${user?.userCode ?? ''} • ${user?.department ?? 'Kỹ thuật Phần mềm'}',
                style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        // Semester Badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.surfaceCardHigh,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderGlass),
          ),
          child: Text(
            'Fall 2026',
            style: AppTextStyles.labelSm.copyWith(color: AppColors.primaryLight, fontSize: 11),
          ),
        ),
        const SizedBox(width: 4),
        // Notification Icon
        IconButton(
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
          icon: const Icon(Icons.notifications_outlined, size: 22, color: Colors.white70),
          onPressed: () {},
        ),
      ],
    );
  }

  Widget _buildUpcomingExamHero(BuildContext context, ExamScheduleModel? exam, ExamProvider examProvider) {
    if (examProvider.isLoading && examProvider.exams.isEmpty) {
      return GlassCard(
        padding: const EdgeInsets.all(22),
        borderRadius: 16,
        border: Border.all(color: AppColors.borderGlow),
        child: Row(
          children: [
            const SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryLight),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Đang tải lịch thi...', style: AppTextStyles.titleMd.copyWith(fontSize: 15)),
                  const SizedBox(height: 3),
                  Text(
                    'Đang đồng bộ dữ liệu ca thi từ máy chủ AIVES',
                    style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    if (examProvider.errorMessage != null && examProvider.exams.isEmpty) {
      return GlassCard(
        padding: const EdgeInsets.all(20),
        borderRadius: 16,
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
        child: Row(
          children: [
            const Icon(Icons.cloud_off_rounded, color: AppColors.warning, size: 30),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Chưa thể tải lịch thi', style: AppTextStyles.titleMd.copyWith(fontSize: 14)),
                  Text(
                    examProvider.errorMessage ?? 'Vui lòng kiểm tra lại kết nối mạng',
                    style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted, fontSize: 11),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            TextButton(
              onPressed: () => examProvider.refreshExams(),
              style: TextButton.styleFrom(
                backgroundColor: AppColors.primary.withValues(alpha: 0.2),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Thử lại', style: TextStyle(color: AppColors.primaryLight, fontSize: 12)),
            ),
          ],
        ),
      );
    }

    if (exam == null) {
      return GlassCard(
        padding: const EdgeInsets.all(20),
        borderRadius: 16,
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.event_available_rounded, color: AppColors.primaryLight, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Không có lịch thi sắp tới', style: AppTextStyles.titleMd),
                  const SizedBox(height: 4),
                  Text(
                    'Hiện tại bạn không có ca thi vấn đáp nào cần thực hiện.',
                    style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final isInProgress = exam.status == ExamStatus.inProgress;

    return GlassCard(
      padding: const EdgeInsets.all(20),
      borderRadius: 16,
      border: Border.all(
        color: isInProgress ? AppColors.secondary.withValues(alpha: 0.6) : AppColors.borderGlow,
        width: 1.5,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: isInProgress ? AppColors.success : AppColors.warning,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        isInProgress ? 'Ca thi đang diễn ra ngay lúc này' : 'Kỳ thi vấn đáp sắp diễn ra',
                        style: AppTextStyles.labelBold.copyWith(
                          color: isInProgress ? AppColors.success : AppColors.warning,
                          fontSize: 13,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge(
                label: isInProgress ? 'Đang thi' : exam.timeRemainingText,
                type: isInProgress ? BadgeType.success : BadgeType.warning,
                icon: isInProgress ? Icons.sensors_rounded : Icons.timer_outlined,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '${exam.courseCode} - ${exam.courseName}',
            style: AppTextStyles.headlineLg.copyWith(fontSize: 20),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.meeting_room_outlined, size: 16, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Hôm nay, 14:00 (${exam.room})',
                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Technical Readiness Tags
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const [
              StatusBadge(label: 'Mic & Cam OK', type: BadgeType.success, icon: Icons.check_circle_outline),
              StatusBadge(label: 'ID SV xác nhận', type: BadgeType.info, icon: Icons.verified_user_outlined),
              StatusBadge(label: 'AI Co-examiner', type: BadgeType.purple, icon: Icons.smart_toy_outlined),
            ],
          ),
          const SizedBox(height: 18),

          // Primary CTA Button: Tiếp tục vào phòng thi hoặc Vào phòng thi ngay
          Container(
            height: 50,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.4),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ExamDetailChecklistScreen(exam: exam),
                    ),
                  );
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(isInProgress ? Icons.sensors_rounded : Icons.mic_rounded, size: 20, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(
                      isInProgress ? 'Tiếp tục vào phòng thi' : 'Vào phòng thi ngay',
                      style: AppTextStyles.labelBold.copyWith(fontSize: 15, color: Colors.white),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCourseModulesSection(BuildContext context, List<ExamScheduleModel> exams, bool isLoading) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.school_outlined, size: 18, color: AppColors.primaryLight),
                const SizedBox(width: 8),
                Text('Học phần của bạn', style: AppTextStyles.titleMd),
              ],
            ),
            Text(
              'Xem tất cả (${exams.length})',
              style: AppTextStyles.bodySm.copyWith(color: AppColors.primaryLight, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (isLoading && exams.isEmpty)
          SizedBox(
            height: 140,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 2,
              separatorBuilder: (context, index) => const SizedBox(width: 14),
              itemBuilder: (context, index) => Container(
                width: 200,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCardLow,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.borderGlass),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryLight),
                    ),
                    SizedBox(height: 10),
                    Text(
                      'Đang tải học phần...',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          )
        else if (exams.isEmpty)
          GlassCard(
            padding: const EdgeInsets.all(16),
            borderRadius: 18,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'Chưa có học phần nào được ghi nhận trong kỳ học.',
                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                ),
              ),
            ),
          )
        else
          SizedBox(
            height: 150,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: exams.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final exam = exams[index];
                return _buildCourseCard(context, exam);
              },
            ),
          ),
      ],
    );
  }

  Widget _buildCourseCard(BuildContext context, ExamScheduleModel exam) {
    return Container(
      width: 240,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderGlass),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  exam.courseCode,
                  style: AppTextStyles.labelBold.copyWith(fontSize: 12, color: AppColors.primaryLight),
                ),
              ),
              Flexible(
                child: Text(
                  '${exam.credits} Tín chỉ',
                  style: AppTextStyles.bodySm.copyWith(fontSize: 11),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            exam.courseName,
            style: AppTextStyles.labelBold.copyWith(fontSize: 13),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const Spacer(),
          Row(
            children: [
              const Icon(Icons.event_note_rounded, size: 14, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Vấn đáp: ${exam.timeRemainingText}',
                  style: AppTextStyles.bodySm.copyWith(fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              // Miniature Avatar Stacks
              Row(
                children: [
                  _buildMiniAvatar('GV'),
                  Transform.translate(offset: const Offset(-6, 0), child: _buildMiniAvatar('TS')),
                ],
              ),
              const SizedBox(width: 2),
              Text('+2', style: AppTextStyles.bodySm.copyWith(fontSize: 10, color: AppColors.textDisabled)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCardHigh,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Sẵn sàng',
                  style: AppTextStyles.bodySm.copyWith(fontSize: 10, color: AppColors.success),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniAvatar(String text) {
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: AppColors.primarySoft,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.surfaceCard, width: 1.5),
      ),
      child: Center(
        child: Text(text, style: const TextStyle(fontSize: 8, color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildRecentResultsSection(BuildContext context, List<ExamScheduleModel> completed) {
    final latestCompleted = completed.isNotEmpty ? completed.first : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Row(
                children: [
                  const Icon(Icons.verified_outlined, size: 18, color: AppColors.success),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Lịch sử điểm vấn đáp gần đây',
                      style: AppTextStyles.titleMd,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            if (latestCompleted != null) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => ExamResultReportScreen(exam: latestCompleted)),
                  );
                },
                child: Text(
                  'Chi tiết',
                  style: AppTextStyles.bodySm.copyWith(color: AppColors.primaryLight, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 12),
        if (latestCompleted == null)
          GlassCard(
            padding: const EdgeInsets.all(16),
            borderRadius: 18,
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceCardHigh,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.history_toggle_off_rounded, color: AppColors.textMuted, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Chưa có kết quả thi vấn đáp', style: AppTextStyles.labelBold),
                      const SizedBox(height: 2),
                      Text(
                        'Điểm số sau khi giảng viên xác nhận sẽ xuất hiện tại đây.',
                        style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          )
        else
          GlassCard(
            padding: const EdgeInsets.all(16),
            borderRadius: 18,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => ExamResultReportScreen(exam: latestCompleted)),
              );
            },
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.psychology_rounded, color: AppColors.success, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${latestCompleted.courseCode} - ${latestCompleted.courseName}', style: AppTextStyles.labelBold),
                      const SizedBox(height: 2),
                      Text(
                        '${latestCompleted.examTitle} • ${latestCompleted.examiners.isNotEmpty ? latestCompleted.examiners.first : "Hội đồng khảo thí"}',
                        style: AppTextStyles.bodySm,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: (latestCompleted.finalScore != null ? AppColors.success : AppColors.warning).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        latestCompleted.finalScore != null ? '${latestCompleted.finalScore!.toStringAsFixed(1)} / 10' : 'Chờ duyệt',
                        style: AppTextStyles.labelBold.copyWith(
                          color: latestCompleted.finalScore != null ? AppColors.success : AppColors.warning,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      latestCompleted.finalScore != null ? 'Đã có điểm' : 'Đang xử lý',
                      style: AppTextStyles.bodySm.copyWith(fontSize: 11, color: AppColors.textDisabled),
                    ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }
}
