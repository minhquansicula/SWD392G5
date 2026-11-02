import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/audio_pulse_orb.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/app_content.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../../exam/models/exam_schedule_model.dart';
import '../../exam/providers/exam_provider.dart';
import '../../report/screens/exam_result_report_screen.dart';
import '../models/viva_question_model.dart';
import '../providers/viva_session_provider.dart';
import '../services/viva_websocket_service.dart';

/// Các trạng thái tương tác giọng nói trong phòng thi vấn đáp
enum VivaVoiceState {
  aiSpeaking, // Giám khảo AI đang đọc câu hỏi (TTS)
  listening, // Sinh viên đang phát biểu trả lời qua Microphone
  socraticProbing, // AI đang đối chiếu Rubric & sinh câu hỏi phản biện / đào sâu
  completed, // Ca thi hoàn tất
}

class VivaRoomScreen extends StatefulWidget {
  final ExamScheduleModel exam;
  final ApiClient? apiClient;

  const VivaRoomScreen({super.key, required this.exam, this.apiClient});

  @override
  State<VivaRoomScreen> createState() => _VivaRoomScreenState();
}

class _VivaRoomScreenState extends State<VivaRoomScreen>
    with TickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();
  bool _hasShownFinishedDialog = false;
  String? _startError;
  late VivaSessionProvider _session;
  bool _loading = false;
  bool _allowPop = false;

  @override
  void initState() {
    super.initState();

    // 1. Kích hoạt API Backend Spring Boot bắt đầu ca thi

    // 2. Tự động kết nối WebSocket demo/viva-ai-v2 với Token xác thực
    _session = context.read<VivaSessionProvider>();
    _session.prepareRoom();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _startRoom();
    });
  }

  Future<void> _startRoom() async {
    if (!mounted || _loading) return;
    setState(() {
      _loading = true;
      _startError = null;
    });
    try {
      if (!await _initExamSessionOnBackend() || !mounted) return;
      final auth = context.read<AuthProvider>();
      await _session.startSession(
        examId: widget.exam.id,
        studentId: auth.currentUser?.id ?? '',
        token: auth.currentUser?.token,
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Gọi API Backend Spring Boot để bắt đầu ca thi
  Future<bool> _initExamSessionOnBackend() async {
    try {
      final exams = context.read<ExamProvider>();
      if (!await exams.startExamOnBackend(
        widget.exam.id,
        apiClient: widget.apiClient,
      )) {
        if (mounted) {
          setState(
            () =>
                _startError = exams.errorMessage ?? 'Không thể bắt đầu ca thi.',
          );
        }
        return false;
      }
      debugPrint(
        '[VivaRoom] Exam schedule started successfully on Spring Boot backend.',
      );
      return true;
    } catch (e) {
      debugPrint('[VivaRoom] Notice: $e');
      if (mounted) {
        setState(
          () =>
              _startError = 'Không thể bắt đầu ca thi. Kiểm tra lại lịch thi.',
        );
      }
      return false;
    }
  }

  @override
  void dispose() {
    _session.stopSession();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _toggleMicrophone() {
    final viva = context.read<VivaSessionProvider>();
    viva.toggleMicrophone();
    _scrollToBottom();
  }

  void _submitCurrentAnswer() {
    final viva = context.read<VivaSessionProvider>();
    viva.submitAnswer();
    _scrollToBottom();
  }

  void _confirmFinishExam(VivaSessionProvider viva) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Nộp bài thi vấn đáp?'),
        content: const Text(
          'Bạn có chắc chắn muốn kết thúc buổi thi và nộp toàn bộ câu trả lời để Giám khảo AI chấm điểm không?',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13.5,
            height: 1.45,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(
              'Tiếp tục thi',
              style: TextStyle(color: Colors.white70),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              Navigator.of(ctx).pop();
              viva.finishExamSession();
            },
            child: const Text(
              'Nộp bài ngay',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showExamFinishedDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: const Text('Ca thi hoàn tất'),
        content: const Text(
          'Ca thi đã được ghi nhận hoàn tất. Kết quả AI là đề xuất; điểm chính thức sẽ hiển thị sau khi giảng viên chốt.',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13.5,
            height: 1.5,
          ),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              context.read<ExamProvider>().refreshExams();
              setState(() => _allowPop = true);
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => ExamResultReportScreen(exam: widget.exam),
                ),
              );
            },
            child: const Text(
              'Xem Bảng Điểm & Nhận Xét',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _confirmExit() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Rời khỏi phòng thi?'),
        content: const Text(
          'Phiên thi vấn đáp đang diễn ra. Bạn có chắc chắn muốn rời khỏi phòng thi không?',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(
              'Tiếp tục thi',
              style: TextStyle(color: Colors.white70),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.dangerDark,
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              setState(() => _allowPop = true);
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) Navigator.of(context).pop();
              });
            },
            child: const Text(
              'Rời phòng',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final viva = context.watch<VivaSessionProvider>();
    final question = viva.currentQuestion;
    if (viva.sessionState == VivaSessionState.completed &&
        !_hasShownFinishedDialog) {
      _hasShownFinishedDialog = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _showExamFinishedDialog();
      });
    }
    final total = math.max(
      question.totalQuestions,
      math.max(1, viva.questions.where((q) => !q.isAdaptiveFollowUp).length),
    );
    final error = _startError ?? viva.errorMessage;
    final micEnabled =
        !_loading &&
        _startError == null &&
        !viva.isFinishing &&
        !viva.isSubmitting &&
        !viva.isAnswerSubmitted &&
        viva.wsStatus == WsConnectionStatus.authenticated &&
        viva.sessionState != VivaSessionState.completed;
    final status = switch (viva.sessionState) {
      VivaSessionState.aiSpeaking => 'Giám khảo đang đọc câu hỏi',
      VivaSessionState.listening => 'Đang thu câu trả lời của bạn',
      VivaSessionState.processing =>
        viva.isFinishing ? 'Đang chấm bài' : 'Đang xử lý',
      VivaSessionState.completed => 'Ca thi đã hoàn tất',
    };
    return PopScope(
      canPop: _allowPop,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _confirmExit();
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              AppContent(
                child: Column(
                  children: [
                    Expanded(
                      child: ListView(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        children: [
                          Row(
                            children: [
                              IconButton(
                                tooltip: 'Rời phòng thi',
                                onPressed: _confirmExit,
                                icon: const Icon(Icons.arrow_back),
                              ),
                              Expanded(
                                child: Text(
                                  'Phòng thi vấn đáp',
                                  style: AppTextStyles.headlineMd,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              StatusBadge(label: widget.exam.courseCode),
                              StatusBadge(
                                label:
                                    'Câu ${question.questionNumber.clamp(1, total)}/$total',
                              ),
                              Semantics(
                                liveRegion: false,
                                label:
                                    'Thời gian còn lại ${viva.formattedTimer}',
                                child: StatusBadge(
                                  label: viva.isFinishing
                                      ? 'Đã gửi bài'
                                      : viva.formattedTimer,
                                  icon: Icons.timer_outlined,
                                  type: BadgeType.warning,
                                  textStyle: AppTextStyles.codeOrTimer,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          if (_loading) const LinearProgressIndicator(),
                          if (error != null) ...[
                            AppMessage(
                              message: error,
                              isError: true,
                              retryLabel: _startError != null
                                  ? 'Thử vào phòng lại'
                                  : 'Kết nối lại / kiểm tra kết quả',
                              onRetry: _loading
                                  ? null
                                  : () async {
                                      if (_startError != null) {
                                        await _startRoom();
                                        return;
                                      }
                                      setState(() => _loading = true);
                                      try {
                                        await viva.recoverSession();
                                      } finally {
                                        if (mounted) {
                                          setState(() => _loading = false);
                                        }
                                      }
                                    },
                            ),
                            const SizedBox(height: 16),
                          ] else if (!_loading &&
                              viva.wsStatus !=
                                  WsConnectionStatus.authenticated) ...[
                            AppMessage(
                              message:
                                  viva.wsStatus == WsConnectionStatus.connecting
                                  ? 'Đang kết nối phòng thi…'
                                  : 'Chưa kết nối được phòng thi. Kiểm tra lại kết nối mạng.',
                            ),
                            const SizedBox(height: 16),
                          ],
                          GlassCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  question.isAdaptiveFollowUp
                                      ? 'Câu hỏi bổ sung'
                                      : 'Câu hỏi chính',
                                  style: AppTextStyles.labelBold.copyWith(
                                    color: AppColors.primaryLight,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  question.content,
                                  style: AppTextStyles.headlineMd.copyWith(
                                    height: 1.5,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Semantics(
                                  liveRegion: true,
                                  child: Text(
                                    status,
                                    style: AppTextStyles.bodyMd,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                ExcludeSemantics(
                                  child: Center(
                                    child: AudioPulseOrb(
                                      size: 88,
                                      state: viva.orbState,
                                      audioLevel: viva.currentAudioLevel,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text('Hội thoại', style: AppTextStyles.headlineMd),
                          const SizedBox(height: 12),
                          if (viva.transcripts.isEmpty)
                            const AppMessage(
                              message:
                                  'Câu hỏi và câu trả lời sẽ xuất hiện tại đây khi cuộc thi bắt đầu.',
                            )
                          else
                            ...viva.transcripts.map(
                              (entry) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: GlassCard(
                                  backgroundColor:
                                      entry.speaker == VivaRole.student
                                      ? AppColors.surfaceCardHigh
                                      : AppColors.surfaceCard,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        entry.speaker == VivaRole.student
                                            ? 'Bạn'
                                            : 'Giám khảo AI',
                                        style: AppTextStyles.labelBold.copyWith(
                                          color: AppColors.primaryLight,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        entry.text,
                                        style: AppTextStyles.bodyMd,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          const SizedBox(height: 16),
                          Text(
                            'Cần nghe lại? Bật mic và đề nghị giám khảo nhắc lại câu hỏi.',
                            style: AppTextStyles.bodySm,
                          ),
                          const SizedBox(height: 16),
                          PrimaryButton(
                            text: 'Kết thúc bài thi',
                            icon: Icons.task_alt,
                            isOutlined: true,
                            onPressed:
                                !_loading &&
                                    _startError == null &&
                                    viva.canFinish
                                ? () => _confirmFinishExam(viva)
                                : null,
                          ),
                          const SizedBox(height: 16),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: AppColors.borderGlass),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: PrimaryButton(
                              text: viva.isRecording ? 'Tắt mic' : 'Bật mic',
                              icon: viva.isRecording
                                  ? Icons.mic_off_outlined
                                  : Icons.mic_outlined,
                              isOutlined: true,
                              onPressed: micEnabled ? _toggleMicrophone : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: PrimaryButton(
                              text: viva.isAnswerSubmitted
                                  ? 'Đã nộp câu'
                                  : 'Nộp câu trả lời',
                              icon: Icons.send_outlined,
                              isLoading: viva.isSubmitting,
                              onPressed: !_loading && viva.canSubmit
                                  ? _submitCurrentAnswer
                                  : null,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (viva.isFinishing && viva.errorMessage == null)
                Positioned.fill(
                  child: ColoredBox(
                    color: AppColors.background.withValues(alpha: 0.96),
                    child: Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
                        child: Semantics(
                          liveRegion: true,
                          child: GlassCard(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const CircularProgressIndicator(),
                                const SizedBox(height: 24),
                                Text(
                                  'Đang nộp bài thi...',
                                  style: AppTextStyles.headlineMd,
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'Giám khảo AI đang chấm bài. Vui lòng chờ kết quả; bạn không cần nộp lại.',
                                  style: AppTextStyles.bodyMd,
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
