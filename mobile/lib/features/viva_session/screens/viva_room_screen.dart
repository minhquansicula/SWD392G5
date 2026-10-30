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
  aiSpeaking,      // Giám khảo AI đang đọc câu hỏi (TTS)
  listening,       // Sinh viên đang phát biểu trả lời qua Microphone
  socraticProbing, // AI đang đối chiếu Rubric & sinh câu hỏi phản biện / đào sâu
  completed,       // Ca thi hoàn tất
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
  bool _hasShownFinishedDialog = false;

  @override
  void initState() {
    super.initState();

    // 1. Kích hoạt API Backend Spring Boot bắt đầu ca thi
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
  }

  /// Gọi API Backend Spring Boot để bắt đầu ca thi
  Future<void> _initExamSessionOnBackend() async {
    try {
      await ApiClient.instance.post(
        '${ApiEndpoints.studentScheduleStart}/${widget.exam.id}/start',
        body: {},
      );
      debugPrint('[VivaRoom] Exam schedule started successfully on Spring Boot backend.');
    } catch (e) {
      debugPrint('[VivaRoom] Notice: $e');
    }
  }

  @override
  void dispose() {
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
    final currentQ = viva.currentQuestion;
    final isAdaptive = currentQ.isAdaptiveFollowUp;

    // Đồng bộ trạng thái giọng nói từ VivaSessionProvider thực tế
    final effectiveVoiceState = viva.wsStatus != WsConnectionStatus.authenticated
        ? VivaVoiceState.aiSpeaking
        : (viva.sessionState == VivaSessionState.listening
            ? VivaVoiceState.listening
            : (viva.sessionState == VivaSessionState.processing
                ? VivaVoiceState.socraticProbing
                : (viva.sessionState == VivaSessionState.completed
                    ? VivaVoiceState.completed
                    : VivaVoiceState.aiSpeaking)));

    // Tự động kiểm tra nếu phiên thi hoàn thành từ server
    if (viva.sessionState == VivaSessionState.completed && !_hasShownFinishedDialog) {
      _hasShownFinishedDialog = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _showExamFinishedDialog();
        }
      });
    }

    return Scaffold(
      backgroundColor: AppColors.surfaceDeep,
      body: SafeArea(
        child: Column(
          children: [
            // Top Telemetry Header
            _buildTopTelemetryBar(viva),

            // Banner thông báo trạng thái kết nối WebSocket thật với Python
            if (viva.wsStatus == WsConnectionStatus.connecting)
              Container(
                width: double.infinity,
                color: AppColors.warning.withValues(alpha: 0.15),
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 14),
                child: Row(
                  children: const [
                    SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.warning),
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Đang kết nối tới Python AI Examiner...',
                        style: TextStyle(color: AppColors.warning, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              )
            else if (viva.wsStatus == WsConnectionStatus.error || viva.wsStatus == WsConnectionStatus.disconnected)
              Container(
                width: double.infinity,
                color: AppColors.danger.withValues(alpha: 0.2),
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 14),
                child: Row(
                  children: const [
                    Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 14),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Mất kết nối với AI Engine. Vui lòng kiểm tra Python server.',
                        style: TextStyle(color: AppColors.danger, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),

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

                    // Voice State Indicator Badge
                    _buildVoiceStatusBadge(effectiveVoiceState),
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
            _buildBottomControlDeck(viva),
          ],
        ),
      ),
    );
  }

  /// Thanh Header trên cùng hiển thị chỉ số câu hỏi và đồng hồ đếm lùi thực
  Widget _buildTopTelemetryBar(VivaSessionProvider viva) {
    final isLiveWs = viva.wsStatus == WsConnectionStatus.authenticated;
    final totalQ = viva.questions.isEmpty ? 1 : viva.questions.length;
    final currentNum = (viva.currentQuestionIndex + 1).clamp(1, totalQ);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(
        color: AppColors.surfaceDeep,
        border: Border(bottom: BorderSide(color: AppColors.borderGlass)),
      ),
      child: Row(
        children: [
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white),
            onPressed: _confirmExit,
          ),
          const SizedBox(width: 6),

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
              'Câu $currentNum/$totalQ',
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
                  viva.formattedTimer,
                  style: AppTextStyles.codeOrTimer.copyWith(fontSize: 11.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHolographicPresenceOrb(VivaSessionProvider viva) {
    final dynamicLevel = viva.currentAudioLevel > 0.05
        ? viva.currentAudioLevel
        : (viva.isRecording ? 0.45 : 0.25);

    return Center(
      child: AudioPulseOrb(
        state: viva.orbState,
        audioLevel: dynamicLevel,
        size: 132,
      ),
    );
  }

  /// Badge trạng thái giọng nói chống tràn layout
  Widget _buildVoiceStatusBadge(VivaVoiceState vs) {
    String text;
    Color color;
    IconData icon;

    switch (vs) {
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

  Widget _buildQuestionCard(VivaQuestionModel q, bool isAdaptive) {
    final tags = q.topicTags.isNotEmpty ? q.topicTags : ['#${widget.exam.courseCode}', '#VivaExam'];

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
                      isAdaptive ? 'Giám Khảo AI • Hỏi Xoáy Socratic (RAG)' : 'Giám Khảo AI • Câu Hỏi #${q.questionNumber}',
                      style: AppTextStyles.labelBold.copyWith(
                        color: isAdaptive ? AppColors.primaryLight : Colors.white,
                        fontSize: 13.5,
                      ),
                    ),
                    Text(
                      'Mức độ Bloom: ${q.bloomLevel}',
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
            q.content.isNotEmpty ? q.content : 'Chào mừng bạn đến với ca thi vấn đáp trực tuyến AIVES.',
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
            children: tags.map<Widget>((t) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCardHigh,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.borderGlass),
                ),
                child: Text(
                  t,
                  style: AppTextStyles.bodySm.copyWith(fontSize: 10.5, color: AppColors.textMuted),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveConversationBubbles(VivaQuestionModel q, VivaSessionProvider viva) {
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
              color: viva.sessionState == VivaSessionState.aiSpeaking
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
                  if (viva.sessionState == VivaSessionState.aiSpeaking)
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
                q.content.isNotEmpty ? q.content : 'Giám khảo AI đang kết nối và chuẩn bị câu hỏi...',
                style: AppTextStyles.bodyMd.copyWith(
                  fontSize: 13,
                  color: viva.sessionState == VivaSessionState.aiSpeaking ? Colors.white : AppColors.textSecondary,
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
              color: viva.isRecording ? AppColors.tertiary.withValues(alpha: 0.6) : AppColors.borderGlass,
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
                  if (viva.isRecording)
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
                viva.isRecording
                    ? 'Em đang trả lời câu hỏi... (Nói vào microphone của máy để ghi nhận trực tiếp)'
                    : 'Nhấn vào biểu tượng Micro bên dưới để bắt đầu trả lời.',
                style: AppTextStyles.bodyMd.copyWith(
                  fontSize: 13,
                  color: viva.isRecording ? AppColors.tertiary : AppColors.textSecondary,
                  fontStyle: viva.isRecording ? FontStyle.italic : FontStyle.normal,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBottomControlDeck(VivaSessionProvider viva) {
    final isMicActive = viva.isRecording || viva.sessionState == VivaSessionState.listening;

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
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: AppColors.primary,
                      duration: Duration(milliseconds: 2000),
                      content: Text('Bạn có thể nói "Xin giám khảo nhắc lại câu hỏi" qua micro để AI đọc lại.'),
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
                gradient: isMicActive
                    ? const LinearGradient(
                        colors: [AppColors.secondary, AppColors.primary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : AppColors.primaryGradient,
                boxShadow: [
                  BoxShadow(
                    color: (isMicActive ? AppColors.tertiary : AppColors.primary).withValues(alpha: 0.65),
                    blurRadius: isMicActive ? 24 : 14,
                    spreadRadius: isMicActive ? 3 : 0,
                  ),
                ],
              ),
              child: Icon(
                isMicActive ? Icons.mic_rounded : Icons.mic_none_rounded,
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
                onPressed: viva.sessionState == VivaSessionState.processing ? null : _submitCurrentAnswer,
              ),
              Text('Nộp câu', style: AppTextStyles.bodySm.copyWith(fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }
}
