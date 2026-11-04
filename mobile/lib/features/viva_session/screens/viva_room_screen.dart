import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
    with TickerProviderStateMixin, WidgetsBindingObserver {
  final ScrollController _scrollController = ScrollController();
  bool _hasShownFinishedDialog = false;
  String? _startError;
  late VivaSessionProvider _session;
  bool _loading = false;
  bool _allowPop = false;

  // Proctoring: Giám sát vi phạm rời ứng dụng / chuyển app / vuốt thanh thông báo
  int _violationCount = 0;
  static const int _maxViolations = 3;
  bool _isShowingViolationDialog = false;
  DateTime? _wentBackgroundAt;

  // Track conversation state to auto-scroll when new speech/transcript arrives
  int _lastTranscriptCount = 0;
  String _lastTranscriptTail = '';
  String _lastQuestionId = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Kích hoạt chế độ Immersive Sticky để ẩn thanh điều hướng và thanh trạng thái
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    // 1. Kích hoạt API Backend Spring Boot bắt đầu ca thi

    // 2. Tự động kết nối WebSocket demo/viva-ai-v2 với Token xác thực
    _session = context.read<VivaSessionProvider>();
    _session.prepareRoom();
    _session.addListener(_onSessionStateChanged);
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
      final scheduledEnd =
          widget.exam.scheduledEndAt ??
          widget.exam.scheduledAt.add(
            Duration(minutes: widget.exam.durationMinutes),
          );
      await _session.startSession(
        examId: widget.exam.id,
        studentId: auth.currentUser?.id ?? '',
        token: auth.currentUser?.token,
        scheduledEndTime: scheduledEnd,
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
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    // Khi thí sinh rời khỏi ứng dụng (nhấn Home, chuyển app, vuốt thông báo)
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.hidden) {
      if (_session.isSessionReady &&
          _session.sessionState != VivaSessionState.completed &&
          !_session.isFinishing) {
        _wentBackgroundAt ??= DateTime.now();
        // Tắt mic ngay lập tức nếu đang thu âm
        if (_session.isRecording) {
          _session.toggleMicrophone();
        }
        debugPrint(
          '[VivaRoom] Thí sinh rời màn hình thi lúc: $_wentBackgroundAt. Ghi nhận vi phạm.',
        );
      }
    } else if (state == AppLifecycleState.resumed) {
      // Phục hồi lại toàn màn hình ngay khi thí sinh quay lại
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

      if (_session.isSessionReady &&
          _session.sessionState != VivaSessionState.completed &&
          !_session.isFinishing &&
          mounted) {
        if (_wentBackgroundAt != null) {
          final diff =
              DateTime.now().difference(_wentBackgroundAt!).inMilliseconds;
          _wentBackgroundAt = null;

          // Nếu rời ứng dụng trên 600ms -> tính là 1 lần vi phạm quy chế
          if (diff > 600 && !_isShowingViolationDialog) {
            setState(() {
              _violationCount++;
            });

            if (_violationCount >= _maxViolations) {
              _showDisqualificationDialog();
            } else {
              _isShowingViolationDialog = true;
              final remaining = _maxViolations - _violationCount;
              _showViolationWarningDialog(_violationCount, remaining);
            }
          }
        }
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    // Khôi phục lại giao diện bình thường khi rời phòng thi
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    _session.removeListener(_onSessionStateChanged);
    _session.stopSession();
    _scrollController.dispose();
    super.dispose();
  }

  void _onSessionStateChanged() {
    if (!mounted) return;
    if (_session.errorMessage != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _scrollController.hasClients) {
          _scrollController.jumpTo(0);
        }
      });
      return;
    }
    if (_session.isFinishing ||
        _session.sessionState == VivaSessionState.completed) {
      return;
    }
    final transcripts = _session.transcripts;
    final qId = _session.currentQuestion.id;
    final lastText = transcripts.isNotEmpty ? transcripts.last.text : '';

    final hasNewQuestion = qId != _lastQuestionId;
    final hasNewTranscripts = transcripts.length != _lastTranscriptCount;
    final hasUpdatedText = lastText != _lastTranscriptTail;

    if (hasNewQuestion || hasNewTranscripts || hasUpdatedText) {
      _lastQuestionId = qId;
      _lastTranscriptCount = transcripts.length;
      _lastTranscriptTail = lastText;
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted &&
          _scrollController.hasClients &&
          _session.errorMessage == null &&
          !_session.isFinishing) {
        if (MediaQuery.disableAnimationsOf(context)) {
          _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
          return;
        }
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
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
          'Bạn đã hoàn thành các câu hỏi trong đề thi. Hệ thống sẽ nộp toàn bộ câu trả lời để Giám khảo AI tiến hành chấm điểm theo Rubric.',
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
              'Xem lại',
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

  void _confirmEarlyFinish(VivaSessionProvider viva, int currentQ, int totalQ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppColors.warning),
            SizedBox(width: 8),
            Text('Nộp bài sớm?'),
          ],
        ),
        content: Text(
          'Bạn mới đang ở câu $currentQ/$totalQ và chưa hoàn thành toàn bộ đề thi.\n\n'
          'Nếu kết thúc bài thi bây giờ, các câu hỏi chưa làm sẽ không có điểm câu trả lời. Bạn có chắc chắn muốn nộp bài sớm không?',
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13.5,
            height: 1.45,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Tiếp tục thi', style: TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              viva.finishExamSession();
            },
            child: const Text(
              'Xác nhận nộp sớm',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  void _showViolationWarningDialog(int count, int remaining) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(
              Icons.warning_amber_rounded,
              color: count >= 2 ? AppColors.danger : AppColors.warning,
              size: 28,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Cảnh báo vi phạm ($count/$_maxViolations)',
                style: TextStyle(
                  color: count >= 2 ? AppColors.danger : Colors.white,
                  fontSize: 16.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        content: Text(
          'Hệ thống phát hiện bạn vừa rời khỏi màn hình thi (nhấn Home, vuốt thông báo hoặc chuyển app sang ứng dụng khác).\n\n'
          '⚠️ Hành vi này đã được ghi vào nhật ký giám sát phòng thi.\n\n'
          'Bạn còn $remaining lần cảnh báo trước khi hệ thống TỰ ĐỘNG THU BÀI & ĐÌNH CHỈ CA THI!',
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13.5,
            height: 1.5,
          ),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  count >= 2 ? AppColors.danger : AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            onPressed: () {
              _isShowingViolationDialog = false;
              Navigator.of(ctx).pop();
            },
            child: const Text(
              'Tôi đã hiểu & Tiếp tục thi',
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

  void _showDisqualificationDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.gavel_rounded, color: AppColors.danger, size: 28),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Đình chỉ ca thi',
                style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: const Text(
          'Bạn đã vi phạm quy chế thi do rời khỏi màn hình ứng dụng quá 3 lần.\n\n'
          'Hệ thống đang tiến hành THU BÀI và chuyển hồ sơ vi phạm kỷ luật phòng thi tới Giảng viên thẩm định.',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13.5,
            height: 1.5,
          ),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              _session.finishExamSession();
            },
            child: const Text(
              'Xác nhận nộp bài',
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
    final viva = context.read<VivaSessionProvider>();
    // Nếu ca thi đã kết thúc hoặc đang trong quá trình nộp bài, không cần cảnh báo gắt
    if (viva.sessionState == VivaSessionState.completed || viva.isFinishing) {
      setState(() => _allowPop = true);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
      });
      return;
    }

    // Nếu phòng đang trong giai đoạn chuẩn bị hoặc gặp lỗi kết nối, cho phép quay lại bình thường
    if (!viva.isSessionReady) {
      setState(() => _allowPop = true);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
      });
      return;
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Rời khỏi phòng thi?'),
        content: const Text(
          'Ca thi vấn đáp đang diễn ra và được giám sát trực tiếp.\n\n'
          'Bạn chỉ có thể hoàn tất bằng cách nộp bài. '
          'Nếu vẫn cố tình thoát khỏi phòng thi, hệ thống sẽ TỰ ĐỘNG KẾT THÚC và nộp bài với kết quả hiện tại ngay lập tức!',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13.5,
            height: 1.45,
          ),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(
              'Tiếp tục thi',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            onPressed: () {
              Navigator.of(ctx).pop();
              // Thí sinh chủ động xác nhận nộp bài sớm để thoát
              viva.finishExamSession();
            },
            child: const Text(
              'Vẫn muốn thoát (Tự nộp bài)',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep({
    required String title,
    required bool isDone,
    bool isLoading = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          if (isDone)
            const Icon(Icons.check_circle, color: AppColors.success, size: 20)
          else if (isLoading)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primary,
              ),
            )
          else
            const Icon(Icons.radio_button_unchecked, color: AppColors.textSecondary, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: AppTextStyles.bodyMd.copyWith(
                color: isDone ? Colors.white : AppColors.textSecondary,
                fontWeight: isDone ? FontWeight.w500 : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreparingView(BuildContext context, VivaSessionProvider viva) {
    final error = _startError ?? viva.errorMessage;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Quay lại',
          onPressed: () {
            setState(() => _allowPop = true);
            Navigator.of(context).pop();
          },
        ),
        title: const Text('Chuẩn bị phòng thi', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: GlassCard(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (error != null) ...[
                        const Icon(Icons.error_outline, color: AppColors.danger, size: 56),
                        const SizedBox(height: 16),
                        Text(
                          'Chưa thể vào phòng thi',
                          style: AppTextStyles.headlineMd.copyWith(color: AppColors.danger),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          error,
                          style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        PrimaryButton(
                          text: 'Thử kết nối lại',
                          icon: Icons.refresh,
                          onPressed: () async {
                            await _startRoom();
                          },
                        ),
                        const SizedBox(height: 12),
                        PrimaryButton(
                          text: 'Rời phòng thi',
                          isOutlined: true,
                          onPressed: () {
                            setState(() => _allowPop = true);
                            Navigator.of(context).pop();
                          },
                        ),
                      ] else ...[
                        const Center(
                          child: AudioPulseOrb(
                            size: 96,
                            state: OrbState.processing,
                            audioLevel: 0.35,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Đang chuẩn bị phòng thi',
                          style: AppTextStyles.headlineMd,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          widget.exam.courseName.isNotEmpty
                              ? '${widget.exam.courseCode} • ${widget.exam.courseName}'
                              : widget.exam.courseCode,
                          style: AppTextStyles.labelBold.copyWith(color: AppColors.primaryLight),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        _buildStep(
                          title: 'Khởi tạo ca thi trên hệ thống',
                          isDone: true,
                        ),
                        _buildStep(
                          title: 'Tải đề thi & tiêu chí đánh giá',
                          isDone: viva.questions.isNotEmpty,
                          isLoading: viva.questions.isEmpty,
                        ),
                        _buildStep(
                          title: 'Kết nối Giám khảo AI (Gemini Live)',
                          isDone: viva.wsStatus == WsConnectionStatus.authenticated && viva.isFirstPlanReceived,
                          isLoading: viva.wsStatus != WsConnectionStatus.authenticated || !viva.isFirstPlanReceived,
                        ),
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceCardHigh,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.headphones_outlined, color: AppColors.primaryLight, size: 22),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Vui lòng đeo tai nghe và giữ trật tự. Giám khảo AI sẽ bắt đầu chào và đặt câu hỏi ngay khi phòng sẵn sàng.',
                                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final viva = context.watch<VivaSessionProvider>();
    final isSessionReady = viva.isSessionReady && _startError == null;
    final isExamActiveOrFinishing = viva.isFinishing || viva.sessionState == VivaSessionState.completed;

    // 1. Khi đang khởi tạo, tải đề thi hoặc kết nối WebSocket ban đầu: Hiển thị màn hình chuẩn bị phòng thi
    if (!isSessionReady && !isExamActiveOrFinishing) {
      return PopScope(
        canPop: _allowPop,
        onPopInvokedWithResult: (didPop, result) {
          if (!didPop) _confirmExit();
        },
        child: _buildPreparingView(context, viva),
      );
    }

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
    final isCompletedAll = viva.allQuestionsCompleted ||
        (question.questionNumber >= total && viva.isAnswerSubmitted && viva.sessionState == VivaSessionState.processing);

    final error = _startError ?? viva.errorMessage;
    final micEnabled =
        !isCompletedAll &&
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
        viva.isFinishing
            ? 'Đang chấm bài'
            : (isCompletedAll
                ? 'Đã trả lời xong. Sẵn sàng nộp bài.'
                : 'Đang xử lý'),
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
                                      : 'Câu: ${viva.formattedTimer}',
                                  icon: Icons.timer_outlined,
                                  type: BadgeType.warning,
                                  textStyle: AppTextStyles.codeOrTimer,
                                ),
                              ),
                              StatusBadge(
                                label: 'Ca thi: ${viva.formattedExamTimer}',
                                icon: Icons.hourglass_top_outlined,
                                type:
                                    viva.scheduledEndTime != null &&
                                        viva.examRemainingSeconds <= 180
                                    ? BadgeType.warning
                                    : BadgeType.info,
                                textStyle: AppTextStyles.codeOrTimer,
                              ),
                              if (_violationCount > 0)
                                StatusBadge(
                                  label: 'Cảnh cáo: $_violationCount/$_maxViolations',
                                  icon: Icons.warning_amber_rounded,
                                  type: BadgeType.danger,
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
                          if (isCompletedAll) ...[
                            GlassCard(
                              backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                              child: Column(
                                children: [
                                  const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 48),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Đã hoàn thành toàn bộ câu hỏi!',
                                    style: AppTextStyles.headlineMd.copyWith(color: AppColors.primaryLight),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Bạn đã trả lời xong $total/$total câu hỏi trong đề thi. Nhấn nút bên dưới để chính thức kết thúc bài thi và chuyển bài cho Giám khảo AI chấm điểm.',
                                    style: AppTextStyles.bodyMd,
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 18),
                                  PrimaryButton(
                                    text: 'Kết thúc bài thi & Nộp ngay',
                                    icon: Icons.task_alt,
                                    isLoading: viva.isFinishing,
                                    onPressed: viva.canFinish ? () => _confirmFinishExam(viva) : null,
                                  ),
                                ],
                              ),
                            ),
                          ] else ...[
                            Text(
                              'Cần nghe lại? Bật mic và đề nghị giám khảo nhắc lại câu hỏi.',
                              style: AppTextStyles.bodySm,
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceCard,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.borderGlass),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.assignment_outlined, color: AppColors.primaryLight, size: 20),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'Tiến độ: Câu ${question.questionNumber}/$total • Hoàn thành các câu để kết thúc bài thi',
                                      style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () => _confirmEarlyFinish(viva, question.questionNumber, total),
                                    style: TextButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: Text(
                                      'Nộp sớm...',
                                      style: TextStyle(
                                        color: AppColors.textSecondary.withValues(alpha: 0.75),
                                        fontSize: 12,
                                        decoration: TextDecoration.underline,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
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
                                  ? (isCompletedAll ? 'Đã hoàn thành' : 'Đã nộp câu')
                                  : 'Nộp câu trả lời',
                              icon: isCompletedAll ? Icons.check_circle_outline : Icons.send_outlined,
                              isLoading: viva.isSubmitting,
                              onPressed: !isCompletedAll && !_loading && viva.canSubmit
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
