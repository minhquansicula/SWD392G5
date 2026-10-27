import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/audio_pulse_orb.dart';
import '../models/viva_question_model.dart';
import '../services/audio_player_service.dart';
import '../services/audio_recorder_service.dart';
import '../services/viva_websocket_service.dart';

enum VivaSessionState {
  aiSpeaking,
  listening,
  processing,
  completed,
}

/// Provider điều phối phiên thi vấn đáp kết nối trực tiếp với demo/viva-ai-v2
class VivaSessionProvider extends ChangeNotifier {
  final AudioRecorderService _recorderService = AudioRecorderService();
  final AudioPlayerService _playerService = AudioPlayerService();
  final VivaWebSocketService _wsService = VivaWebSocketService();

  List<VivaQuestionModel> _questions = [];
  int _currentQuestionIndex = 0;
  VivaSessionState _sessionState = VivaSessionState.aiSpeaking;

  final List<VivaTranscriptEntry> _transcripts = [];
  double _currentAudioLevel = 0.0;
  final double _acousticAccuracy = 0.968; // Độ chính xác âm học 96.8%

  // Đồng hồ đếm lùi phòng thi
  int _remainingSeconds = 14 * 60 + 52;
  Timer? _countdownTimer;

  StreamSubscription? _audioChunkSub;
  StreamSubscription? _amplitudeSub;
  StreamSubscription? _wsMessageSub;

  Map<String, dynamic>? _finalEvaluationReport;

  // Getters
  List<VivaQuestionModel> get questions => _questions;
  int get currentQuestionIndex => _currentQuestionIndex;
  VivaQuestionModel get currentQuestion =>
      _questions.isNotEmpty && _currentQuestionIndex < _questions.length
          ? _questions[_currentQuestionIndex]
          : const VivaQuestionModel(
              id: 'q-live-01',
              questionNumber: 1,
              totalQuestions: 1,
              bloomLevel: 'Vấn đáp Trực tiếp',
              content: 'Chào mừng bạn đến với phòng thi vấn đáp trực tuyến AIVES.',
            );
  VivaSessionState get sessionState => _sessionState;
  List<VivaTranscriptEntry> get transcripts => _transcripts;
  double get currentAudioLevel => _currentAudioLevel;
  double get acousticAccuracy => _acousticAccuracy;
  int get remainingSeconds => _remainingSeconds;
  bool get isRecording => _recorderService.isRecording;
  WsConnectionStatus get wsStatus => _wsService.currentStatus;
  Map<String, dynamic>? get finalEvaluationReport => _finalEvaluationReport;

  OrbState get orbState {
    switch (_sessionState) {
      case VivaSessionState.aiSpeaking:
        return OrbState.aiSpeaking;
      case VivaSessionState.listening:
        return OrbState.listening;
      case VivaSessionState.processing:
        return OrbState.processing;
      case VivaSessionState.completed:
        return OrbState.idle;
    }
  }

  String get formattedTimer {
    final m = (_remainingSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (_remainingSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  /// Khởi tạo phiên thi và kết nối tới WebSocket viva-ai-v2
  Future<void> startSession({
    required String examId,
    required String studentId,
    String? token,
    String? customWsUrl,
  }) async {
    _currentQuestionIndex = 0;
    _transcripts.clear();
    _remainingSeconds = 14 * 60 + 52;
    _finalEvaluationReport = null;

    // 1. Tải trước danh sách câu hỏi bốc thăm từ cơ sở dữ liệu nếu có
    try {
      final qRes = await ApiClient.instance.get(
        '${ApiEndpoints.assignedQuestions}/$examId/assigned-questions',
      );
      if (qRes.success && qRes.data is List && (qRes.data as List).isNotEmpty) {
        final list = qRes.data as List;
        _questions = list
            .map((item) => VivaQuestionModel.fromAssignedQuestion(
                  item as Map<String, dynamic>,
                  list.length,
                ))
            .toList();
        debugPrint('[VivaSessionProvider] Loaded ${_questions.length} assigned questions.');
      }
    } catch (e) {
      debugPrint('[VivaSessionProvider] Notice: $e');
    }

    if (_questions.isEmpty) {
      _questions = const [
        VivaQuestionModel(
          id: 'q-live-01',
          questionNumber: 1,
          totalQuestions: 1,
          bloomLevel: 'Vấn đáp Trực tiếp',
          content: 'Chào mừng bạn đến với phòng thi vấn đáp trực tuyến. AI Examiner đang khởi tạo ca thi...',
        ),
      ];
    }

    // 2. Khởi tạo microphone thu âm PCM 16kHz & loa phát PCM 24kHz (Gemini Live)
    await _recorderService.init();
    await _playerService.init();
    await _playerService.startStreamPlayer(sampleRate: 24000, numChannels: 1);

    // 3. Kết nối WebSocket viva-ai-v2 với Token xác thực
    final authToken = token ?? ApiClient.instance.authToken ?? '';
    final wsUrl = customWsUrl ?? ApiEndpoints.defaultWebSocketUrl;
    await _wsService.connect(
      wsUrl: wsUrl,
      examId: examId,
      token: authToken,
    );

    // 4. Lắng nghe luồng audio từ micro và gửi binary chunks lên server
    _audioChunkSub = _recorderService.audioChunkStream.listen((chunk) {
      _wsService.sendBinaryPcmChunk(chunk);
    });

    // 5. Lắng nghe biên độ âm thanh cho quả cầu 3D Orb Visualizer
    _amplitudeSub = _recorderService.amplitudeStream.listen((lvl) {
      if (_sessionState == VivaSessionState.listening) {
        _currentAudioLevel = lvl;
        notifyListeners();
      }
    });

    // 6. Lắng nghe các sự kiện từ viva-ai-v2 (ready, plan, transcript, audio_chunk, turn_complete, report)
    _wsMessageSub = _wsService.messageStream.listen(_handleIncomingWsMessage);

    // 7. Khởi động đồng hồ đếm lùi phòng thi
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        _remainingSeconds--;
        notifyListeners();
      } else {
        timer.cancel();
      }
    });

    // Ban đầu đặt trạng thái AI speaking
    _sessionState = VivaSessionState.aiSpeaking;
    notifyListeners();
  }

  void _startAutoListening() async {
    await _playerService.stop();
    await _recorderService.startRecording();
    _sessionState = VivaSessionState.listening;
    notifyListeners();
  }

  void toggleMicrophone() async {
    if (_recorderService.isRecording) {
      await _recorderService.stopRecording();
      _sessionState = VivaSessionState.processing;
    } else {
      // Khi thí sinh bắt đầu nói, dừng tiếng AI (Barge-in)
      await _playerService.stop();
      _sessionState = VivaSessionState.listening;
      await _recorderService.startRecording();
      _transcripts.add(VivaTranscriptEntry(
        speaker: VivaRole.student,
        speakerName: 'Thí sinh',
        text: '...',
        timestamp: DateTime.now(),
        isPartial: true,
      ));
    }
    notifyListeners();
  }

  /// Nộp câu trả lời cho câu hỏi hiện tại
  Future<void> submitAnswer() async {
    await _recorderService.stopRecording();
    await _playerService.stop();
    _sessionState = VivaSessionState.processing;
    notifyListeners();

    // Gửi tín hiệu hoàn tất lượt trả lời
    _wsService.sendControlMessage({
      'type': 'submit_answer',
      'question_id': currentQuestion.id,
    });
  }

  /// Kết thúc toàn bộ ca thi và kích hoạt AI chấm điểm Rubric
  Future<void> finishExamSession() async {
    await _recorderService.stopRecording();
    await _playerService.stop();
    _sessionState = VivaSessionState.processing;
    notifyListeners();

    _wsService.finishExam();

    // Fallback bảo vệ timeout sau 4 giây nếu mạng chậm
    Future.delayed(const Duration(seconds: 4), () {
      if (_sessionState != VivaSessionState.completed) {
        _sessionState = VivaSessionState.completed;
        notifyListeners();
      }
    });
  }

  /// Xử lý các sự kiện từ demo/viva-ai-v2
  void _handleIncomingWsMessage(Map<String, dynamic> msg) {
    final type = msg['type']?.toString();

    // 1. Sự kiện Ready: Server xác thực thành công và báo thông tin ca thi
    if (type == 'ready') {
      _sessionState = VivaSessionState.aiSpeaking;
      final timeLimit = msg['main_answer_time_limit_seconds'];
      if (timeLimit is int && timeLimit > 0) {
        _remainingSeconds = timeLimit;
      }
      notifyListeners();
    }
    // 2. Sự kiện Plan: Cập nhật câu hỏi chính hoặc câu hỏi đào sâu (RAG)
    else if (type == 'plan') {
      final kind = msg['kind']?.toString() ?? msg['type']?.toString();
      final content = msg['content']?.toString() ?? '';
      final number = msg['number'] ?? (_currentQuestionIndex + 1);
      final total = msg['total'] ?? _questions.length;
      final isFollowup = kind == 'followup';

      if (isFollowup) {
        // AI sinh câu hỏi đào sâu qua RAG
        final followupQ = VivaQuestionModel(
          id: 'followup-${DateTime.now().millisecondsSinceEpoch}',
          questionNumber: _currentQuestionIndex + 1,
          totalQuestions: total is int ? total : _questions.length,
          bloomLevel: 'Phân tích & Đào sâu (Socratic RAG)',
          content: content.isNotEmpty ? content : 'Câu hỏi đào sâu đối chiếu Rubric môn học',
          isAdaptiveFollowUp: true,
          parentQuestionId: currentQuestion.id,
        );
        _questions.insert(_currentQuestionIndex + 1, followupQ);
        _currentQuestionIndex++;
      } else if (content.isNotEmpty) {
        if (_questions.isNotEmpty && _currentQuestionIndex < _questions.length) {
          _questions[_currentQuestionIndex] = _questions[_currentQuestionIndex].copyWith(
            content: content,
            questionNumber: number is int ? number : _currentQuestionIndex + 1,
            totalQuestions: total is int ? total : _questions.length,
          );
        }
      }

      _sessionState = VivaSessionState.aiSpeaking;
      notifyListeners();
    }
    // 3. Sự kiện Transcript: Phụ đề thời gian thực (Giám khảo AI hoặc Thí sinh)
    else if (type == 'transcript') {
      final text = msg['text']?.toString() ?? '';
      final role = msg['role']?.toString() ?? 'assistant';
      final isFinal = msg['final'] == true;
      final isAi = (role == 'assistant');

      if (isAi) {
        if (_transcripts.isNotEmpty &&
            _transcripts.last.speaker == VivaRole.ai &&
            _transcripts.last.isPartial) {
          _transcripts[_transcripts.length - 1] = _transcripts.last.copyWith(
            text: text,
            isPartial: !isFinal,
          );
        } else {
          _transcripts.add(VivaTranscriptEntry(
            speaker: VivaRole.ai,
            speakerName: 'Giám Khảo AI • Gemini Live',
            text: text,
            timestamp: DateTime.now(),
            isPartial: !isFinal,
          ));
        }
      } else {
        if (_transcripts.isNotEmpty &&
            _transcripts.last.speaker == VivaRole.student &&
            _transcripts.last.isPartial) {
          _transcripts[_transcripts.length - 1] = _transcripts.last.copyWith(
            text: text,
            isPartial: !isFinal,
          );
        } else {
          _transcripts.add(VivaTranscriptEntry(
            speaker: VivaRole.student,
            speakerName: 'Thí sinh',
            text: text,
            timestamp: DateTime.now(),
            isPartial: !isFinal,
          ));
        }
      }
      notifyListeners();
    }
    // 4. Nhận luồng âm thanh PCM 24kHz từ Gemini Live -> Phát ra loa thiết bị
    else if (type == 'audio_chunk') {
      final chunk = msg['data'];
      if (chunk is Uint8List) {
        _playerService.feedPcmChunk(chunk);
        if (_sessionState != VivaSessionState.aiSpeaking) {
          _sessionState = VivaSessionState.aiSpeaking;
        }
        // Tính biên độ âm thanh cho quả cầu 3D Orb khi AI nói
        if (chunk.isNotEmpty) {
          _currentAudioLevel = 0.4 + ((chunk[0].abs() % 50) / 100.0);
        }
        notifyListeners();
      }
    }
    // 5. Sự kiện Turn Complete: Giám khảo AI đọc xong câu hỏi -> Mở mic cho thí sinh
    else if (type == 'turn_complete') {
      _playerService.stop();
      if (_sessionState == VivaSessionState.aiSpeaking) {
        _sessionState = VivaSessionState.listening;
        _startAutoListening();
        notifyListeners();
      }
    }
    // 6. Sự kiện Clear Audio: Thí sinh ngắt lời AI (Barge-in)
    else if (type == 'clear_audio') {
      debugPrint('[VivaSessionProvider] User interrupted AI voice playback.');
      _playerService.clearAudioBuffer();
      notifyListeners();
    }
    // 7. Sự kiện Report: Báo cáo kết quả và bảng điểm Rubric hoàn tất
    else if (type == 'report') {
      _playerService.stop();
      _finalEvaluationReport = msg['data'] is Map<String, dynamic>
          ? msg['data'] as Map<String, dynamic>
          : msg['report'] as Map<String, dynamic>?;
      _sessionState = VivaSessionState.completed;
      notifyListeners();
    }
    // 8. Hết danh sách câu hỏi
    else if (type == 'questions_complete') {
      debugPrint('[VivaSessionProvider] All questions answered. Ready to finish.');
      finishExamSession();
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _audioChunkSub?.cancel();
    _amplitudeSub?.cancel();
    _wsMessageSub?.cancel();
    _playerService.dispose();
    _recorderService.dispose();
    _wsService.dispose();
    super.dispose();
  }
}
