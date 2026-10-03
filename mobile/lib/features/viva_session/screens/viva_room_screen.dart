import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/audio_pulse_orb.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../../exam/models/exam_schedule_model.dart';
import '../models/viva_question_model.dart';
import '../providers/viva_session_provider.dart';
import '../../report/screens/exam_result_report_screen.dart';

class VivaRoomScreen extends StatefulWidget {
  final ExamScheduleModel exam;

  const VivaRoomScreen({
    super.key,
    required this.exam,
  });

  @override
  State<VivaRoomScreen> createState() => _VivaRoomScreenState();
}

class _VivaRoomScreenState extends State<VivaRoomScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final studentId = authProvider.currentUser?.userCode ?? 'SE170245';
      context.read<VivaSessionProvider>().startSession(
            examId: widget.exam.id,
            studentId: studentId,
          );
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _confirmExit() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 28),
            const SizedBox(width: 8),
            Text('Rời phòng thi?', style: AppTextStyles.headlineMd),
          ],
        ),
        content: Text(
          'Buổi thi vấn đáp đang diễn ra. Rời khỏi phòng thi có thể ảnh hưởng đến kết quả đánh giá cuối cùng của bạn.',
          style: AppTextStyles.bodyMd,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Tiếp tục thi', style: TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.dangerDark,
              minimumSize: const Size(100, 40),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Rời phòng'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<VivaSessionProvider>();

    // Auto-scroll when new transcripts arrive
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

    // Auto-navigate to result report when session is completed
    if (session.sessionState == VivaSessionState.completed) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => ExamResultReportScreen(exam: widget.exam),
          ),
        );
      });
    }

    final currentQ = session.currentQuestion;

    return Scaffold(
      backgroundColor: AppColors.surfaceDeep,
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar
            _buildTopAppBar(session),

            // Main Viva Stage (Scrollable)
            Expanded(
              child: SingleChildScrollView(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                child: Column(
                  children: [
                    // Dynamic Holographic AI Orb
                    const SizedBox(height: 10),
                    Center(
                      child: AudioPulseOrb(
                        state: session.orbState,
                        audioLevel: session.currentAudioLevel,
                        size: 140,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // AI Status Label
                    _buildAiStatusLabel(session),
                    const SizedBox(height: 16),

                    // Current Question Card
                    _buildQuestionCard(currentQ, session),
                    const SizedBox(height: 14),

                    // Live Speech-to-Text Transcript Feed
                    _buildTranscriptSection(session),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),

            // Bottom Audio Controls Bar
            _buildBottomControls(session),
          ],
        ),
      ),
    );
  }

  Widget _buildTopAppBar(VivaSessionProvider session) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: AppColors.surfaceDeep,
        border: Border(bottom: BorderSide(color: AppColors.borderGlass)),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
            onPressed: _confirmExit,
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Phòng Thi Viva AI',
                  style: AppTextStyles.labelBold.copyWith(fontSize: 15),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '${widget.exam.courseCode} • Hội đồng vấn đáp',
                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // Question count indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.surfaceCardHigh,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderGlass),
            ),
            child: Row(
              children: [
                const Icon(Icons.quiz_outlined, size: 14, color: AppColors.secondaryLight),
                const SizedBox(width: 4),
                Text(
                  'Câu ${session.currentQuestionIndex + 1}/${session.questions.length}',
                  style: AppTextStyles.labelSm.copyWith(color: Colors.white),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Countdown Timer Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                const Icon(Icons.schedule_rounded, size: 14, color: AppColors.warning),
                const SizedBox(width: 4),
                Text(
                  session.formattedTimer,
                  style: AppTextStyles.codeOrTimer.copyWith(fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAiStatusLabel(VivaSessionProvider session) {
    String text;
    Color color;
    IconData icon;

    switch (session.sessionState) {
      case VivaSessionState.aiSpeaking:
        text = 'AI Examiner đang đọc câu hỏi (TTS)...';
        color = AppColors.secondaryLight;
        icon = Icons.volume_up_rounded;
        break;
      case VivaSessionState.listening:
        text = 'AI Examiner đang lắng nghe sinh viên trả lời...';
        color = AppColors.tertiary;
        icon = Icons.graphic_eq_rounded;
        break;
      case VivaSessionState.processing:
        text = 'AI đang đối chiếu Rubric & sinh câu hỏi đào sâu...';
        color = AppColors.warning;
        icon = Icons.auto_awesome_rounded;
        break;
      case VivaSessionState.completed:
        text = 'Buổi thi vấn đáp đã hoàn thành!';
        color = AppColors.success;
        icon = Icons.check_circle_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 6),
          Text(
            text,
            style: AppTextStyles.labelSm.copyWith(color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionCard(VivaQuestionModel q, VivaSessionProvider session) {
    return GlassCard(
      padding: const EdgeInsets.all(18),
      borderRadius: 18,
      backgroundColor: AppColors.surfaceCard,
      border: Border.all(
        color: q.isAdaptiveFollowUp
            ? AppColors.secondaryLight.withValues(alpha: 0.6)
            : AppColors.borderGlass,
        width: q.isAdaptiveFollowUp ? 1.5 : 1,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.psychology_alt_rounded, size: 18, color: AppColors.primaryGlow),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      q.isAdaptiveFollowUp
                          ? 'Giám Khảo AI • Hỏi Xoáy / Làm Rõ'
                          : 'Giám Khảo AI • Câu Hỏi #${q.questionNumber}',
                      style: AppTextStyles.labelBold.copyWith(
                        color: q.isAdaptiveFollowUp ? AppColors.secondaryLight : Colors.white,
                      ),
                    ),
                    Text('Mức độ Bloom: ${q.bloomLevel}', style: AppTextStyles.bodySm),
                  ],
                ),
              ),
              if (q.isAdaptiveFollowUp)
                const StatusBadge(
                  label: 'Adaptive Follow-up',
                  type: BadgeType.purple,
                  icon: Icons.auto_awesome,
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            q.content,
            style: AppTextStyles.headlineMd.copyWith(
              fontSize: 16,
              height: 1.5,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 12),
          // Topic Tags
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: q.topicTags.map((tag) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCardLow,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  tag,
                  style: AppTextStyles.bodySm.copyWith(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTranscriptSection(VivaSessionProvider session) {
    // Look for student transcript entry
    final studentEntries = session.transcripts.where((t) => t.speaker == VivaRole.student).toList();
    final studentText = studentEntries.isNotEmpty
        ? studentEntries.last.text
        : 'Đang mở micro, chuẩn bị nhận diện giọng nói...';

    return GlassCard(
      padding: const EdgeInsets.all(16),
      borderRadius: 18,
      backgroundColor: AppColors.surfaceCardLow,
      border: Border.all(color: AppColors.borderGlass),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 12,
                backgroundColor: AppColors.primaryLight,
                child: Icon(Icons.person, size: 14, color: Colors.white),
              ),
              const SizedBox(width: 8),
              Text(
                'Thí Sinh: Bạn (SE170245)',
                style: AppTextStyles.labelBold.copyWith(fontSize: 13),
              ),
              const Spacer(),
              if (session.sessionState == VivaSessionState.listening)
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Đang ghi âm & stream',
                      style: AppTextStyles.bodySm.copyWith(color: AppColors.success, fontSize: 11),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceDeep,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderGlass),
            ),
            child: Text(
              studentText,
              style: AppTextStyles.bodyMd.copyWith(
                color: Colors.white,
                fontStyle: FontStyle.italic,
                height: 1.45,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Độ chuẩn xác âm học: ${(session.acousticAccuracy * 100).toStringAsFixed(1)}%',
                style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted, fontSize: 11),
              ),
              Text(
                'Raw PCM • 16kHz • 16-bit Mono',
                style: AppTextStyles.codeOrTimer.copyWith(
                  fontSize: 11,
                  color: AppColors.tertiary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBottomControls(VivaSessionProvider session) {
    final isListening = session.sessionState == VivaSessionState.listening;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceDeep,
        border: const Border(top: BorderSide(color: AppColors.borderGlass)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Replay Question button
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.replay_rounded, size: 26, color: Colors.white70),
                onPressed: () => session.repeatQuestion(),
              ),
              Text('Hỏi lại', style: AppTextStyles.bodySm.copyWith(fontSize: 11)),
            ],
          ),

          // Central Large Glowing Microphone Button (74px)
          GestureDetector(
            onTap: () => session.toggleMicrophone(),
            child: Container(
              width: 74,
              height: 74,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: isListening
                    ? const LinearGradient(
                        colors: [Color(0xFF06B6D4), AppColors.primary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : AppColors.primaryGradient,
                boxShadow: [
                  BoxShadow(
                    color: (isListening ? AppColors.tertiary : AppColors.primary)
                        .withValues(alpha: 0.6),
                    blurRadius: isListening ? 24 : 14,
                    spreadRadius: isListening ? 3 : 0,
                  ),
                ],
              ),
              child: Icon(
                isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
                size: 34,
                color: Colors.white,
              ),
            ),
          ),

          // Submit Answer button
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.send_rounded, size: 26, color: AppColors.secondaryLight),
                onPressed: session.sessionState == VivaSessionState.processing
                    ? null
                    : () => session.submitAnswer(),
              ),
              Text('Nộp câu', style: AppTextStyles.bodySm.copyWith(fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }
}
