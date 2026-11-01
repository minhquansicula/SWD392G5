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
      _questions = [
        const VivaQuestionModel(
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
    // Loa ngoài sẽ tự động kích hoạt stream ngay khi chunk âm thanh đầu tiên từ AI tới để tránh cạn buffer

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
      // BẢO VỆ CHỐNG TIẾNG VỌNG (Acoustic Echo Loop):
      // CHỈ gửi audio lên WebSocket khi thực sự ở trạng thái listening (lượt nói của thí sinh).
      // Khi AI đang nói (aiSpeaking) hoặc đang xử lý (processing), toàn bộ dữ liệu micro
      // đều bị chặn lại để loa ngoài không phát âm thanh của AI dội thẳng vào mic rồi gửi ngược về Gemini Live.
      if (_sessionState == VivaSessionState.listening) {
        _wsService.sendBinaryPcmChunk(chunk);
      }
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
        debugPrint('[VivaSessionProvider] Time expired! Force finishing exam session.');
        finishExamSession(isTimeout: true);
      }
    });

    // Ban đầu đặt trạng thái AI speaking
    _sessionState = VivaSessionState.aiSpeaking;
    notifyListeners();
  }

  int _currentTurnId = 0;

  void _startAutoListening() async {
    final turnId = ++_currentTurnId;
    debugPrint('[VivaSessionProvider] turn_complete received. Waiting for audio player to drain before enabling mic...');
    // Chờ cho đến khi toàn bộ âm thanh từ buffer loa ngoài được phát trọn vẹn ra ngoài
    // cộng thêm 600ms để tiếng vang âm phòng tiêu tán triệt để trước khi kích hoạt mic
    await _playerService.waitUntilPlaybackFinished(extraBufferMs: 600);

    // Kiểm tra xem lượt chờ này có còn hợp lệ hay không (không bị ngắt bởi barge-in, nộp bài, hoặc chuyển câu)
    if (turnId != _currentTurnId || _sessionState != VivaSessionState.aiSpeaking) {
      debugPrint('[VivaSessionProvider] Auto-listening cancelled (state changed or new turn active).');
      return;
    }

    debugPrint('[VivaSessionProvider] Audio playback drained completely. Opening microphone for student response.');
    if (!_recorderService.isRecording) {
      await _recorderService.startRecording();
    }
    _sessionState = VivaSessionState.listening;
    notifyListeners();
  }

  void toggleMicrophone() async {
    _currentTurnId++;
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

  /// Kết thúc toàn bộ ca thi và kích hoạt AI chấm điểm Rubric (hỗ trợ cả nộp thủ công và timeout ép buộc)
  Future<void> finishExamSession({bool isTimeout = false, String? examScheduleId}) async {
    if (_sessionState == VivaSessionState.completed) return;

    _currentTurnId++;
    await _recorderService.stopRecording();
    await _playerService.stop();
    _sessionState = VivaSessionState.processing;
    notifyListeners();

    // 1. Gửi lệnh kết thúc qua WebSocket cho viva-ai-v2
    _wsService.finishExam();

    // 2. Dự phòng REST API: Nếu sau 3 giây WS chưa trả report, gọi trực tiếp endpoint HTTP finish
    final scheduleId = examScheduleId ?? (_questions.isNotEmpty ? _questions.first.parentQuestionId : null);
    Future.delayed(const Duration(seconds: 3), () async {
      if (_sessionState != VivaSessionState.completed) {
        if (scheduleId != null && scheduleId.isNotEmpty) {
          try {
            debugPrint('[VivaSessionProvider] WS finish timeout, calling REST API fallback: ${ApiEndpoints.aiServiceBaseUrl}${ApiEndpoints.aiSessionFinish}/$scheduleId/finish');
            final res = await ApiClient.instance.post(
              '${ApiEndpoints.aiServiceBaseUrl}${ApiEndpoints.aiSessionFinish}/$scheduleId/finish',
              body: {},
            );
            if (res.success && res.data is Map<String, dynamic>) {
              _finalEvaluationReport = res.data as Map<String, dynamic>;
            }
          } catch (e) {
            debugPrint('[VivaSessionProvider] REST finish fallback error: $e');
          }
        }
        _sessionState = VivaSessionState.completed;
        notifyListeners();
      }
    });
  }

  /// Xử lý các sự kiện từ demo/viva-ai-v2
  void _handleIncomingWsMessage(Map<String, dynamic> msg) {
    try {
      final type = msg['type']?.toString();
      _questions = List<VivaQuestionModel>.from(_questions);

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
      // Khi có câu hỏi mới, đảm bảo dừng mic ngay
      if (_recorderService.isRecording) {
        _recorderService.stopRecording();
      }
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
        if (_sessionState != VivaSessionState.aiSpeaking) {
          _sessionState = VivaSessionState.aiSpeaking;
          // Dập tắt micro ngay lập tức khi âm thanh AI bắt đầu phát để chống vọng âm loa ngoài vào mic
          if (_recorderService.isRecording) {
            _recorderService.stopRecording();
          }
        }
        _playerService.feedPcmChunk(chunk);
        // Tính biên độ âm thanh cho quả cầu 3D Orb khi AI nói
        if (chunk.isNotEmpty) {
          _currentAudioLevel = 0.4 + ((chunk[0].abs() % 50) / 100.0);
        }
        notifyListeners();
      }
    }
    // 5. Sự kiện Turn Complete: Giám khảo AI đọc xong câu hỏi -> Mở mic cho thí sinh
    else if (type == 'turn_complete') {
      if (_sessionState == VivaSessionState.aiSpeaking) {
        _startAutoListening();
      }
    }
    // 6. Sự kiện Clear Audio: Thí sinh ngắt lời AI (Barge-in)
    else if (type == 'clear_audio') {
      debugPrint('[VivaSessionProvider] User interrupted AI voice playback.');
      _currentTurnId++;
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
  } catch (e, stack) {
    debugPrint('[VivaSessionProvider] Error handling incoming WS message: $e\n$stack');
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
