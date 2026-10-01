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

class StudentHomeScreen extends StatelessWidget {
  const StudentHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final examProvider = context.watch<ExamProvider>();
    final heroExam = examProvider.upcomingHeroExam ?? examProvider.exams.first;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top User Header
              _buildTopHeader(user),
              const SizedBox(height: 20),

              // Hero Card: Upcoming Viva Exam (from Stitch design)
              _buildUpcomingExamHero(context, heroExam),
              const SizedBox(height: 24),

              // Section: Học phần của bạn (Horizontal Carousel)
              _buildCourseModulesSection(context, examProvider.exams),
              const SizedBox(height: 24),

              // Section: Lịch sử điểm vấn đáp gần đây
              _buildRecentResultsSection(context, examProvider.completedExams),
              const SizedBox(height: 20),
            ],
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
                  const Text('👋', style: TextStyle(fontSize: 16)),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                '${user?.userCode ?? 'SE170245'} • ${user?.department ?? 'Kỹ thuật Phần mềm'}',
                style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        // Semester Badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: AppColors.surfaceCardHigh,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderGlass),
          ),
          child: Text(
            'Fall 2026',
            style: AppTextStyles.labelSm.copyWith(color: AppColors.primaryLight),
          ),
        ),
        const SizedBox(width: 8),
        // Notification Icon
        IconButton(
          icon: const Icon(Icons.notifications_outlined, size: 22, color: Colors.white70),
          onPressed: () {},
        ),
      ],
    );
  }

  Widget _buildUpcomingExamHero(BuildContext context, ExamScheduleModel exam) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      borderRadius: 22,
      border: Border.all(color: AppColors.borderGlow, width: 1.5),
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
                      decoration: const BoxDecoration(
                        color: AppColors.warning,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Kỳ thi vấn đáp sắp diễn ra',
                        style: AppTextStyles.labelBold.copyWith(color: AppColors.warning, fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge(
                label: exam.timeRemainingText,
                type: BadgeType.warning,
                icon: Icons.timer_outlined,
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

          // Primary CTA Button: Vào phòng thi ngay
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
                    const Icon(Icons.mic_rounded, size: 20, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(
                      'Vào phòng thi ngay',
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

  Widget _buildCourseModulesSection(BuildContext context, List<ExamScheduleModel> exams) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.school_outlined, size: 18, color: AppColors.primaryGlow),
                const SizedBox(width: 8),
                Text('Học phần của bạn', style: AppTextStyles.titleMd),
              ],
            ),
            Text(
              'Xem tất cả (${exams.length})',
              style: AppTextStyles.bodySm.copyWith(color: AppColors.secondaryLight, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        const SizedBox(height: 12),
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
        color: AppColors.secondary,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.surfaceCard, width: 1.5),
      ),
      child: Center(
        child: Text(text, style: const TextStyle(fontSize: 8, color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildRecentResultsSection(BuildContext context, List<ExamScheduleModel> completed) {
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
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ExamResultReportScreen()),
                );
              },
              child: Text(
                'Chi tiết',
                style: AppTextStyles.bodySm.copyWith(color: AppColors.secondaryLight, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        GlassCard(
          padding: const EdgeInsets.all(16),
          borderRadius: 18,
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ExamResultReportScreen()),
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
                    Text('SWD392 - Software Architecture', style: AppTextStyles.labelBold),
                    const SizedBox(height: 2),
                    Text('Final Viva Defense • TS. Nguyễn Văn A', style: AppTextStyles.bodySm),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '8.5 / 10',
                      style: AppTextStyles.labelBold.copyWith(color: AppColors.success, fontSize: 13),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text('Đã xong', style: AppTextStyles.bodySm.copyWith(fontSize: 11, color: AppColors.textDisabled)),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
