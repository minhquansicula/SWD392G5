import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/audio_pulse_orb.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/voice_wave_visualizer.dart';
import '../../auth/providers/auth_provider.dart';
import '../../exam/models/exam_schedule_model.dart';
import '../../report/screens/exam_result_report_screen.dart';
import '../models/viva_question_model.dart';
import '../providers/viva_session_provider.dart';
import '../services/viva_websocket_service.dart';

/// Các trạng thái tương tác giọng nói trong phòng thi vấn đáp
enum VivaVoiceState {
  aiSpeaking,    // Giám khảo AI đang đọc câu hỏi (TTS)
  listening,     // Sinh viên đang phát biểu trả lời qua Microphone
  socraticProbing, // AI đang đối chiếu Rubric & sinh câu hỏi phản biện / đào sâu
  completed,     // Ca thi hoàn tất
}

class VivaRoomScreen extends StatefulWidget {
  final ExamScheduleModel exam;

  const VivaRoomScreen({
    super.key,
    required this.exam,
  });

  @override
  State<VivaRoomScreen> createState() => _VivaRoomScreenState();
}

class _VivaRoomScreenState extends State<VivaRoomScreen> with TickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();

  // Trạng thái giọng nói phòng thi
  VivaVoiceState _voiceState = VivaVoiceState.aiSpeaking;
  int _currentQuestionIndex = 0;
  bool _isMicActive = false;
  double _audioInputLevel = 0.5;
  Timer? _audioSimulationTimer;

  // Đồng hồ đếm lùi phòng thi (14:52)
  int _remainingSeconds = 14 * 60 + 52;
  Timer? _countdownTimer;

  // Danh sách câu hỏi trong ca thi (Khởi tạo mặc định và tự động nạp từ Backend API nếu có)
  List<Map<String, dynamic>> _questions = [
    {
      'questionNumber': 1,
      'bloomLevel': 'Vận dụng (Applying)',
      'isFollowUp': false,
      'content': 'Em hãy giải thích sự khác biệt giữa Monolithic Architecture và Microservices Architecture? Khi nào hệ thống thực tế của doanh nghiệp nên chuyển đổi sang Microservices?',
      'tags': ['#SoftwareArchitecture', '#Microservices', '#Scalability'],
      'aiSpeakerText': 'Chào bạn. Tôi là Giám khảo AI phụ trách buổi vấn đáp hôm nay. Chúng ta bắt đầu với câu hỏi số 1: Em hãy giải thích sự khác biệt giữa Monolithic Architecture và Microservices Architecture? Khi nào hệ thống thực tế của doanh nghiệp nên chuyển đổi sang Microservices?',
      'studentReplyText': 'Thưa thầy cô và Giám khảo AI, Monolithic gom toàn bộ module vào một codebase và runtime duy nhất, dễ triển khai ban đầu nhưng khó scale độc lập. Ngược lại, Microservices chia nhỏ theo nghiệp vụ (Domain-Driven Design), scale linh hoạt từng service...',
    },
    {
      'questionNumber': 2,
      'bloomLevel': 'Phân tích & Phản biện (Analyzing)',
      'isFollowUp': true,
      'content': 'Trong mô hình Microservices, khi xảy ra sự cố mạng làm một service bị treo, em sẽ áp dụng Circuit Breaker pattern như thế nào để tránh hiệu ứng Domino (Cascading Failure)?',
      'tags': ['#CircuitBreaker', '#FaultTolerance', '#Resilience4j'],
      'aiSpeakerText': 'Câu trả lời rất tốt. Để đào sâu thêm vào khía cạnh chịu lỗi: Trong mô hình Microservices, khi một service bị treo hoặc timeout, em sẽ thiết kế Circuit Breaker pattern như thế nào để ngăn chặn sự sụp đổ dây chuyền của toàn hệ thống?',
      'studentReplyText': 'Em sẽ cấu hình 3 trạng thái: Closed, Open và Half-Open. Khi tỷ lệ request lỗi vượt ngưỡng 50% trong sliding window, circuit breaker mở ra lập tức, trả về fallback response ngay để bảo toàn tài nguyên các service khác...',
    },
    {
      'questionNumber': 3,
      'bloomLevel': 'Đánh giá & Tối ưu (Evaluating)',
      'isFollowUp': false,
      'content': 'Khi hai microservices cần giao tiếp bất đồng bộ đảm bảo tính toàn vẹn dữ liệu (Eventual Consistency), em sẽ chọn Kafka hay RabbitMQ và lý giải vì sao?',
      'tags': ['#MessageBroker', '#ApacheKafka', '#EventDriven'],
      'aiSpeakerText': 'Câu hỏi số 3: Khi hai microservices cần trao đổi dữ liệu bất đồng bộ đảm bảo Eventual Consistency ở quy mô hàng triệu bản ghi, em chọn Apache Kafka hay RabbitMQ và vì sao?',
      'studentReplyText': 'Với bài toán lưu vết event sourcing và lượng dữ liệu lớn hàng triệu bản ghi cần replay dữ liệu, em sẽ ưu tiên Apache Kafka vì kiến trúc Log-based immutable và throughput cực cao...',
    },
  ];

  @override
  void initState() {
    super.initState();

    // 1. Kích hoạt API Backend Spring Boot bắt đầu ca thi & nạp đề thi thực tế
    _initExamSessionOnBackend();

    // 2. Tự động kết nối WebSocket demo/viva-ai-v2 với Token xác thực
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      context.read<VivaSessionProvider>().startSession(
        examId: widget.exam.id,
        studentId: auth.currentUser?.id ?? '',
        token: auth.currentUser?.token,
      );
    });

    // 3. Khởi chạy đồng hồ đếm lùi ca thi
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        setState(() => _remainingSeconds--);
      } else {
        timer.cancel();
      }
    });

    // 4. Mô phỏng nhịp sóng âm nhẹ nhàng
    _audioSimulationTimer = Timer.periodic(const Duration(milliseconds: 250), (t) {
      if (_voiceState == VivaVoiceState.listening && _isMicActive) {
        setState(() {
          _audioInputLevel = 0.35 + (DateTime.now().millisecond % 65) / 100.0;
        });
      }
    });
  }

  /// Gọi API Backend Spring Boot để bắt đầu ca thi và tải câu hỏi gán thật
  Future<void> _initExamSessionOnBackend() async {
    try {
      // Gọi API POST /api/student/schedules/{id}/start để kích hoạt trạng thái IN_PROGRESS
      await ApiClient.instance.post(
        '${ApiEndpoints.studentScheduleStart}/${widget.exam.id}/start',
        body: {},
      );
      debugPrint('[VivaRoom] Exam schedule started successfully on Spring Boot backend.');

      // Gọi API GET /api/schedules/{id}/assigned-questions để lấy câu hỏi thực tế
      final qRes = await ApiClient.instance.get(
        '${ApiEndpoints.assignedQuestions}/${widget.exam.id}/assigned-questions',
      );

      if (qRes.success && qRes.data is List && (qRes.data as List).isNotEmpty) {
        final list = qRes.data as List;
        final loadedQuestions = <Map<String, dynamic>>[];

        for (int i = 0; i < list.length; i++) {
          final item = list[i] as Map<String, dynamic>;
          final qData = item['question'] is Map ? item['question'] as Map<String, dynamic> : item;
          loadedQuestions.add({
            'questionNumber': item['orderIndex'] ?? (i + 1),
            'bloomLevel': qData['bloomTaxonomy'] ?? qData['bloomLevel'] ?? 'Vấn đáp Trực tiếp',
            'isFollowUp': item['isFollowUp'] == true,
            'content': qData['content'] ?? qData['questionText'] ?? 'Câu hỏi vấn đáp môn học',
            'tags': ['#${widget.exam.courseCode}', '#VivaExam'],
            'aiSpeakerText': qData['content'] ?? 'Câu hỏi số ${i + 1}',
            'studentReplyText': '...',
          });
        }

        if (mounted && loadedQuestions.isNotEmpty) {
          setState(() {
            _questions = loadedQuestions;
          });
          debugPrint('[VivaRoom] Loaded ${_questions.length} assigned questions from database.');
        }
      }
    } catch (e) {
      debugPrint('[VivaRoom] Notice: Using course-prepared questions fallback: $e');
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _audioSimulationTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  String get _formattedTimer {
    final m = (_remainingSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (_remainingSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
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

    setState(() {
      _isMicActive = !_isMicActive;
      if (_isMicActive) {
        _voiceState = VivaVoiceState.listening;
      }
    });
    _scrollToBottom();
  }

  void _submitCurrentAnswer() {
    final viva = context.read<VivaSessionProvider>();
    viva.submitAnswer();

    setState(() {
      _voiceState = VivaVoiceState.socraticProbing;
      _isMicActive = false;
    });
    _scrollToBottom();

    // Giả lập sau 2 giây AI suy nghĩ -> chuyển sang câu tiếp theo hoặc hoàn tất
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      if (_currentQuestionIndex < _questions.length - 1) {
        setState(() {
          _currentQuestionIndex++;
          _voiceState = VivaVoiceState.aiSpeaking;
        });
        _scrollToBottom();
      } else {
        setState(() {
          _voiceState = VivaVoiceState.completed;
        });
        _showExamFinishedDialog();
      }
    });
  }

  void _showExamFinishedDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: Row(
          children: const [
            Icon(Icons.check_circle_rounded, color: AppColors.success, size: 28),
            SizedBox(width: 10),
            Text('Ca Thi Hoàn Tất', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Chúc mừng bạn đã hoàn thành phiên thi vấn đáp AI! Giám khảo AI đã tổng hợp bảng điểm và nhận xét chi tiết Rubric.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5, height: 1.5),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => ExamResultReportScreen(exam: widget.exam),
                ),
              );
            },
            child: const Text('Xem Bảng Điểm & Nhận Xét', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
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
        title: Row(
          children: const [
            Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 26),
            SizedBox(width: 8),
            Text('Rời khỏi phòng thi?', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Phiên thi vấn đáp đang diễn ra. Bạn có chắc chắn muốn rời khỏi phòng thi không?',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Tiếp tục thi', style: TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.dangerDark),
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Rời phòng', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final viva = context.watch<VivaSessionProvider>();
    final currentQ = _questions.isNotEmpty && _currentQuestionIndex < _questions.length
        ? _questions[_currentQuestionIndex]
        : {
            'questionNumber': 1,
            'bloomLevel': 'Vấn đáp Trực tiếp',
            'content': 'Chào mừng bạn đến với phòng thi vấn đáp trực tuyến AIVES.',
            'tags': ['#${widget.exam.courseCode}', '#VivaExam'],
            'aiSpeakerText': 'Chào bạn, chúng ta bắt đầu bài thi.',
            'studentReplyText': '...',
          };
    final isAdaptive = currentQ['isFollowUp'] == true;

    // Tự động kiểm tra nếu phiên thi hoàn thành từ server
    if (viva.sessionState == VivaSessionState.completed && _voiceState != VivaVoiceState.completed) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        setState(() => _voiceState = VivaVoiceState.completed);
        _showExamFinishedDialog();
      });
    }

    return Scaffold(
      backgroundColor: AppColors.surfaceDeep,
      body: SafeArea(
        child: Column(
          children: [
            // Top Telemetry Header (Đã fix hoàn toàn lỗi tràn pixel 65px)
            _buildTopTelemetryBar(viva),

            // Interactive State Simulator Pill (Cho phép trải nghiệm các trạng thái)
            _buildStatePreviewChips(),

            // Scrollable Viva Interview Stage
            Expanded(
              child: SingleChildScrollView(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                child: Column(
                  children: [
                    const SizedBox(height: 10),

                    // Center Holographic Voice Presence Orb
                    _buildHolographicPresenceOrb(viva),
                    const SizedBox(height: 12),

                    // Voice State Indicator Badge (Đã fix lỗi tràn 17px)
                    _buildVoiceStatusBadge(),
                    const SizedBox(height: 16),

                    // Current Question Card (Highlighted)
                    _buildQuestionCard(currentQ, isAdaptive),
                    const SizedBox(height: 16),

                    // Live Speech-to-Text Conversation Stream
                    _buildLiveConversationBubbles(currentQ, viva),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // Bottom Audio Control Deck
            _buildBottomControlDeck(),
          ],
        ),
      ),
    );
  }

  /// Thanh Header trên cùng đã được tối ưu hóa responsive, không bao giờ tràn pixel
  Widget _buildTopTelemetryBar(VivaSessionProvider viva) {
    final isLiveWs = viva.wsStatus == WsConnectionStatus.authenticated;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(
        color: AppColors.surfaceDeep,
        border: Border(bottom: BorderSide(color: AppColors.borderGlass)),
      ),
      child: Row(
        children: [
          // Nút quay lại nhỏ gọn
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white),
            onPressed: _confirmExit,
          ),
          const SizedBox(width: 6),

          // Tên phòng thi & mã môn học co giãn linh hoạt
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        'Phòng Thi Voice AIVES',
                        style: AppTextStyles.labelBold.copyWith(fontSize: 13.5),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: isLiveWs ? AppColors.success : AppColors.secondary,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ),
                Text(
                  isLiveWs ? '${widget.exam.courseCode} • Gemini Live & RAG' : widget.exam.courseCode,
                  style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted, fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),

          // Pill chỉ số câu hỏi
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.surfaceCardHigh,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.borderGlass),
            ),
            child: Text(
              'Câu ${_currentQuestionIndex + 1}/${_questions.length}',
              style: AppTextStyles.labelSm.copyWith(color: Colors.white, fontSize: 11),
            ),
          ),
          const SizedBox(width: 6),

          // Pill đồng hồ đếm lùi
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.timer_outlined, size: 13, color: AppColors.warning),
                const SizedBox(width: 4),
                Text(
                  _formattedTimer,
                  style: AppTextStyles.codeOrTimer.copyWith(fontSize: 11.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatePreviewChips() {
    return Container(
      width: double.infinity,
      color: AppColors.surfaceCardLow.withValues(alpha: 0.6),
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            Text('Xem thử: ', style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted, fontSize: 11)),
            _buildSimulatorChip('AI Đang Nói', VivaVoiceState.aiSpeaking),
            _buildSimulatorChip('Thí Sinh Trả Lời', VivaVoiceState.listening),
            _buildSimulatorChip('AI Phản Biện (RAG)', VivaVoiceState.socraticProbing),
          ],
        ),
      ),
    );
  }

  Widget _buildSimulatorChip(String label, VivaVoiceState state) {
    final isSelected = _voiceState == state;
    return GestureDetector(
      onTap: () {
        setState(() {
          _voiceState = state;
          _isMicActive = (state == VivaVoiceState.listening);
        });
      },
      child: Container(
        margin: const EdgeInsets.only(left: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? AppColors.primaryLight : AppColors.borderGlass),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildHolographicPresenceOrb(VivaSessionProvider viva) {
    OrbState orbState;
    switch (_voiceState) {
      case VivaVoiceState.aiSpeaking:
        orbState = OrbState.aiSpeaking;
        break;
      case VivaVoiceState.listening:
        orbState = OrbState.listening;
        break;
      case VivaVoiceState.socraticProbing:
        orbState = OrbState.processing;
        break;
      case VivaVoiceState.completed:
        orbState = OrbState.idle;
        break;
    }

    final dynamicLevel = viva.currentAudioLevel > 0.05
        ? viva.currentAudioLevel
        : (_isMicActive ? _audioInputLevel : 0.6);

    return Center(
      child: AudioPulseOrb(
        state: orbState,
        audioLevel: dynamicLevel,
        size: 132,
      ),
    );
  }

  /// Badge trạng thái giọng nói chống tràn layout (Fix 17px overflow)
  Widget _buildVoiceStatusBadge() {
    String text;
    Color color;
    IconData icon;

    switch (_voiceState) {
      case VivaVoiceState.aiSpeaking:
        text = 'Giám khảo AI đang xướng câu hỏi qua giọng nói...';
        color = AppColors.secondaryLight;
        icon = Icons.volume_up_rounded;
        break;
      case VivaVoiceState.listening:
        text = 'AI đang lắng nghe câu trả lời qua micro...';
        color = AppColors.tertiary;
        icon = Icons.graphic_eq_rounded;
        break;
      case VivaVoiceState.socraticProbing:
        text = 'AI đối chiếu Rubric & RAG để hỏi đào sâu...';
        color = AppColors.warning;
        icon = Icons.auto_awesome_rounded;
        break;
      case VivaVoiceState.completed:
        text = 'Ca thi hoàn tất • Sẵn sàng tổng kết điểm số';
        color = AppColors.success;
        icon = Icons.check_circle_rounded;
        break;
    }

    return Container(
      constraints: const BoxConstraints(maxWidth: 340),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              text,
              style: AppTextStyles.labelSm.copyWith(color: color, fontSize: 11),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionCard(Map<String, dynamic> q, bool isAdaptive) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      borderRadius: 16,
      backgroundColor: AppColors.surfaceCard,
      border: Border.all(
        color: isAdaptive ? AppColors.primaryLight.withValues(alpha: 0.6) : AppColors.borderGlass,
        width: isAdaptive ? 1.5 : 1,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.psychology_rounded, size: 18, color: AppColors.primaryLight),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isAdaptive ? 'Giám Khảo AI • Hỏi Xoáy Socratic (RAG)' : 'Giám Khảo AI • Câu Hỏi #${q['questionNumber']}',
                      style: AppTextStyles.labelBold.copyWith(
                        color: isAdaptive ? AppColors.primaryLight : Colors.white,
                        fontSize: 13.5,
                      ),
                    ),
                    Text(
                      'Mức độ Bloom: ${q['bloomLevel']}',
                      style: AppTextStyles.bodySm.copyWith(color: AppColors.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ),
              if (isAdaptive)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.35)),
                  ),
                  child: Text(
                    'Đào Sâu',
                    style: AppTextStyles.labelSm.copyWith(color: AppColors.primaryLight, fontSize: 10.5),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            q['content'],
            style: AppTextStyles.headlineMd.copyWith(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              height: 1.45,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: (q['tags'] as List? ?? ['#VivaExam']).map<Widget>((t) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCardHigh,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.borderGlass),
                ),
                child: Text(
                  t.toString(),
                  style: AppTextStyles.bodySm.copyWith(fontSize: 10.5, color: AppColors.textMuted),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveConversationBubbles(Map<String, dynamic> q, VivaSessionProvider viva) {
    // Nếu có transcript thời gian thực từ viva-ai-v2, ưu tiên hiển thị
    final liveTranscripts = viva.transcripts;

    if (liveTranscripts.isNotEmpty) {
      return Column(
        children: liveTranscripts.map((entry) {
          final isAi = entry.speaker == VivaRole.ai;
          return Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isAi ? AppColors.surfaceCardLow : AppColors.surfaceCard,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isAi
                    ? AppColors.primaryGlow.withValues(alpha: 0.4)
                    : AppColors.tertiary.withValues(alpha: 0.4),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: (isAi ? AppColors.primary : AppColors.tertiary).withValues(alpha: 0.25),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isAi ? Icons.smart_toy_rounded : Icons.person_rounded,
                        size: 13,
                        color: isAi ? AppColors.primaryLight : AppColors.tertiary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      entry.speakerName,
                      style: AppTextStyles.labelBold.copyWith(
                        fontSize: 12,
                        color: isAi ? Colors.white : AppColors.tertiary,
                      ),
                    ),
                    const Spacer(),
                    if (entry.isPartial)
                      Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: isAi ? AppColors.primaryLight : AppColors.tertiary,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isAi ? 'Đang đọc...' : 'Đang phát biểu...',
                            style: AppTextStyles.bodySm.copyWith(
                              fontSize: 10,
                              color: isAi ? AppColors.primaryLight : AppColors.tertiary,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  entry.text,
                  style: AppTextStyles.bodyMd.copyWith(
                    fontSize: 13,
                    color: Colors.white,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      );
    }

    return Column(
      children: [
        // AI Examiner Speech Bubble Fallback
        Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surfaceCardLow,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _voiceState == VivaVoiceState.aiSpeaking
                  ? AppColors.primaryGlow.withValues(alpha: 0.5)
                  : AppColors.borderGlass,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.smart_toy_rounded, size: 13, color: AppColors.primaryLight),
                  ),
                  const SizedBox(width: 8),
                  Text('Lời Giám khảo AI xướng thoại', style: AppTextStyles.labelBold.copyWith(fontSize: 12)),
                  const Spacer(),
                  if (_voiceState == VivaVoiceState.aiSpeaking)
                    VoiceWaveVisualizer(
                      isActive: true,
                      level: 0.7,
                      height: 14,
                      barCount: 4,
                      color: AppColors.primaryLight,
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                q['aiSpeakerText'] ?? q['content'],
                style: AppTextStyles.bodyMd.copyWith(
                  fontSize: 13,
                  color: _voiceState == VivaVoiceState.aiSpeaking ? Colors.white : AppColors.textSecondary,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),

        // Student Live Answer Bubble Fallback
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surfaceCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _isMicActive ? AppColors.tertiary.withValues(alpha: 0.6) : AppColors.borderGlass,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const CircleAvatar(
                    radius: 11,
                    backgroundColor: AppColors.primaryLight,
                    child: Icon(Icons.person_rounded, size: 13, color: Colors.white),
                  ),
                  const SizedBox(width: 8),
                  Text('Thí sinh (Bạn phát biểu)', style: AppTextStyles.labelBold.copyWith(fontSize: 12)),
                  const Spacer(),
                  if (_isMicActive)
                    Row(
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: const BoxDecoration(color: AppColors.tertiary, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Đang thu âm...',
                          style: AppTextStyles.labelSm.copyWith(color: AppColors.tertiary, fontSize: 10.5),
                        ),
                      ],
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _isMicActive
                    ? 'Em đang trả lời câu hỏi... (Nói vào microphone của máy để ghi nhận trực tiếp)'
                    : (q['studentReplyText'] ?? 'Nhấn vào biểu tượng Micro bên dưới để bắt đầu trả lời.'),
                style: AppTextStyles.bodyMd.copyWith(
                  fontSize: 13,
                  color: _isMicActive ? AppColors.tertiary : AppColors.textSecondary,
                  fontStyle: _isMicActive ? FontStyle.italic : FontStyle.normal,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBottomControlDeck() {
    final viva = context.watch<VivaSessionProvider>();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceDeep,
        border: const Border(top: BorderSide(color: AppColors.borderGlass)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.6),
            blurRadius: 18,
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
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                icon: const Icon(Icons.replay_rounded, size: 26, color: Colors.white70),
                onPressed: () {
                  setState(() => _voiceState = VivaVoiceState.aiSpeaking);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: AppColors.primary,
                      duration: Duration(milliseconds: 1500),
                      content: Text('Giám khảo AI đang xướng lại câu hỏi...'),
                    ),
                  );
                },
              ),
              Text('Hỏi lại', style: AppTextStyles.bodySm.copyWith(fontSize: 11)),
            ],
          ),

          // Central Large Glowing Interactive Microphone Button (74px)
          GestureDetector(
            onTap: _toggleMicrophone,
            child: Container(
              width: 74,
              height: 74,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: (viva.isRecording || _isMicActive)
                    ? const LinearGradient(
                        colors: [AppColors.secondary, AppColors.primary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : AppColors.primaryGradient,
                boxShadow: [
                  BoxShadow(
                    color: ((viva.isRecording || _isMicActive) ? AppColors.tertiary : AppColors.primary).withValues(alpha: 0.65),
                    blurRadius: (viva.isRecording || _isMicActive) ? 24 : 14,
                    spreadRadius: (viva.isRecording || _isMicActive) ? 3 : 0,
                  ),
                ],
              ),
              child: Icon(
                (viva.isRecording || _isMicActive) ? Icons.mic_rounded : Icons.mic_none_rounded,
                size: 34,
                color: Colors.white,
              ),
            ),
          ),

          // Submit / Finish turn button
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                icon: const Icon(Icons.send_rounded, size: 26, color: AppColors.primaryLight),
                onPressed: _voiceState == VivaVoiceState.socraticProbing ? null : _submitCurrentAnswer,
              ),
              Text('Nộp câu', style: AppTextStyles.bodySm.copyWith(fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }
}
