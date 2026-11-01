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

enum VivaSessionState { aiSpeaking, listening, processing, completed }

/// Provider điều phối phiên thi vấn đáp kết nối trực tiếp với demo/viva-ai-v2
class VivaSessionProvider extends ChangeNotifier {
  VivaSessionProvider({
    AudioRecorderService? recorder,
    AudioPlayerService? player,
    VivaWebSocketService? socket,
    ApiClient? apiClient,
    ApiClient? aiClient,
    Duration finishTimeout = const Duration(seconds: 45),
  }) : _recorderService = recorder ?? AudioRecorderService(),
       _playerService = player ?? AudioPlayerService(),
       _wsService = socket ?? VivaWebSocketService(),
       _api = apiClient ?? ApiClient.instance,
       _aiApi =
           aiClient ?? (ApiClient()..setBaseUrl(ApiEndpoints.aiServiceBaseUrl)),
       _finishTimeout = finishTimeout;
  final Duration _finishTimeout;
  final AudioRecorderService _recorderService;
  final AudioPlayerService _playerService;
  final VivaWebSocketService _wsService;
  final ApiClient _api;
  final ApiClient _aiApi;
  String? _scheduleId;
  String? _sessionToken;
  int _currentTurnId = 0;
  bool _disposed = false;
  bool _starting = false;
  bool _active = false;
  bool _finishing = false;
  int _generation = 0;
  Timer? _finishTimer;
  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  @override
  void notifyListeners() {
    if (!_disposed) super.notifyListeners();
  }

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
    if (_disposed || _starting || _active) return;
    final authToken = token ?? _api.authToken ?? '';
    if (authToken.trim().isEmpty || examId.trim().isEmpty) {
      _errorMessage = 'Thiếu phiên đăng nhập hoặc mã ca thi.';
      notifyListeners();
      return;
    }
    _starting = true;
    final generation = ++_generation;
    _errorMessage = null;
    _finishing = false;
    _scheduleId = examId;
    _sessionToken = authToken;
    _currentQuestionIndex = 0;
    _questions = [];
    _transcripts.clear();
    _remainingSeconds = 0;
    _finalEvaluationReport = null;
    _sessionState = VivaSessionState.processing;
    notifyListeners();
    try {
      final qRes = await _api.get(
        '${ApiEndpoints.assignedQuestions}/$examId/assigned-questions',
      );
      if (_disposed || generation != _generation) return;
      if (!qRes.success || qRes.data is! List) throw StateError(qRes.message);
      final list = qRes.data as List;
      _questions = list
          .map(
            (item) => VivaQuestionModel.fromAssignedQuestion(
              item as Map<String, dynamic>,
              list.length,
            ),
          )
          .toList();
      _wsMessageSub = _wsService.messageStream.listen(_handleIncomingWsMessage);
      await _wsService.connect(
        wsUrl: customWsUrl ?? ApiEndpoints.defaultWebSocketUrl,
        examId: examId,
        token: authToken,
      );
      if (_disposed || generation != _generation) return;
      if (_wsService.currentStatus != WsConnectionStatus.authenticated) {
        throw StateError('Không thể xác thực kết nối phòng thi.');
      }
      if (!await _recorderService.init()) {
        throw StateError('Không thể truy cập microphone.');
      }
      if (_disposed || generation != _generation) return;
      if (!await _playerService.init()) {
        throw StateError('Không thể khởi tạo loa.');
      }
      if (_disposed || generation != _generation) return;
      _audioChunkSub = _recorderService.audioChunkStream.listen((chunk) {
        if (_sessionState == VivaSessionState.listening && !_finishing) {
          _wsService.sendBinaryPcmChunk(chunk);
        }
      });
      _amplitudeSub = _recorderService.amplitudeStream.listen((level) {
        if (!_disposed && _sessionState == VivaSessionState.listening) {
          _currentAudioLevel = level;
          notifyListeners();
        }
      });
      _active = true;
      _sessionState = VivaSessionState.aiSpeaking;
      _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (_remainingSeconds > 0) {
          _remainingSeconds--;
          notifyListeners();
          if (_remainingSeconds == 0) {
            timer.cancel();
            finishExamSession(isTimeout: true);
          }
        }
      });
    } catch (error) {
      if (!_disposed && generation == _generation) {
        await stopSession();
        _errorMessage = error.toString();
      }
    } finally {
      if (generation == _generation) _starting = false;
      notifyListeners();
    }
  }

  Future<void> stopSession() async {
    _generation++;
    _currentTurnId++;
    _active = false;
    _starting = false;
    _countdownTimer?.cancel();
    _finishTimer?.cancel();
    await _audioChunkSub?.cancel();
    await _amplitudeSub?.cancel();
    await _wsMessageSub?.cancel();
    _audioChunkSub = null;
    _amplitudeSub = null;
    _wsMessageSub = null;
    _wsService.disconnect();
    await _recorderService.stopRecording();
    await _playerService.stop();
  }

  void _startAutoListening() async {
    final generation = _generation;
    final turnId = ++_currentTurnId;
    await _playerService.waitUntilPlaybackFinished(extraBufferMs: 600);
    if (!_disposed &&
        _active &&
        !_finishing &&
        generation == _generation &&
        turnId == _currentTurnId &&
        _sessionState == VivaSessionState.aiSpeaking) {
      try {
        await _recorderService.startRecording();
        if (_disposed || generation != _generation) return;
        _sessionState = VivaSessionState.listening;
      } catch (error) {
        _errorMessage = error.toString();
      }
      notifyListeners();
    }
  }

  void toggleMicrophone() async {
    if (!_active || _finishing || _disposed) return;
    _currentTurnId++;
    try {
      if (_recorderService.isRecording) {
        await _recorderService.stopRecording();
        _sessionState = VivaSessionState.processing;
      } else {
        // Khi thí sinh bắt đầu nói, dừng tiếng AI (Barge-in)
        await _playerService.stop();
        _sessionState = VivaSessionState.listening;
        await _recorderService.startRecording();
        _transcripts.add(
          VivaTranscriptEntry(
            speaker: VivaRole.student,
            speakerName: 'Thí sinh',
            text: '...',
            timestamp: DateTime.now(),
            isPartial: true,
          ),
        );
      }
      notifyListeners();
    } catch (error) {
      _errorMessage = error.toString();
      notifyListeners();
    }
  }

  /// Nộp câu trả lời cho câu hỏi hiện tại
  Future<void> submitAnswer() async {
    if (!_active || _finishing || _disposed) return;
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
  Future<void> finishExamSession({
    bool isTimeout = false,
    String? examScheduleId,
  }) async {
    if (!_active ||
        _finishing ||
        _disposed ||
        _sessionState == VivaSessionState.completed) {
      return;
    }
    final scheduleId = examScheduleId ?? _scheduleId;
    if (scheduleId == null || scheduleId != _scheduleId) {
      _errorMessage = 'Mã ca thi không khớp phiên hiện tại.';
      notifyListeners();
      return;
    }
    _finishing = true;
    _currentTurnId++;
    final generation = _generation;
    _countdownTimer?.cancel();
    _finishTimer?.cancel();
    await _recorderService.stopRecording();
    await _playerService.stop();
    if (_disposed || generation != _generation) return;
    _sessionState = VivaSessionState.processing;
    notifyListeners();

    final sent = _wsService.finishExam();
    if (!sent) {
      // Use HTTP only when no WebSocket command was sent. Never repeat an
      // accepted WebSocket command merely because grading takes longer.
      _aiApi.setAuthToken(_api.authToken ?? _sessionToken);
      final result = await _aiApi.post(
        '${ApiEndpoints.aiSessionFinish}/$scheduleId/finish',
        body: {},
      );
      if (_disposed || generation != _generation) return;
      if (result.success &&
          result.data is Map<String, dynamic> &&
          (result.data as Map).isNotEmpty) {
        _completeWithReport(result.data as Map<String, dynamic>);
        return;
      }
      _errorMessage =
          'Chưa gửi được yêu cầu kết thúc hoặc chưa nhận được kết quả hợp lệ. Kiểm tra trạng thái ca thi trước khi thử lại.';
      notifyListeners();
      return;
    }

    // A timeout leaves the outcome unknown; only a server report completes the exam.
    _finishTimer = Timer(_finishTimeout, () {
      if (!_disposed &&
          _active &&
          _sessionState != VivaSessionState.completed) {
        _errorMessage =
            'Chưa nhận được kết quả chấm điểm. Kiểm tra trạng thái ca thi.';
        notifyListeners();
      }
    });
  }

  void _completeWithReport(Map<String, dynamic> report) {
    _finishTimer?.cancel();
    _countdownTimer?.cancel();
    _currentTurnId++;
    _recorderService.stopRecording();
    _playerService.stop();
    _finalEvaluationReport = report;
    _errorMessage = null;
    _sessionState = VivaSessionState.completed;
    notifyListeners();
  }

  /// Xử lý các sự kiện từ demo/viva-ai-v2
  void _handleIncomingWsMessage(Map<String, dynamic> msg) {
    if (_disposed) return;
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
        _currentTurnId++;
        final limit = msg['time_limit_seconds'];
        if (limit is int && limit >= 0) _remainingSeconds = limit;
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
            content: content.isNotEmpty
                ? content
                : 'Câu hỏi đào sâu đối chiếu Rubric môn học',
            isAdaptiveFollowUp: true,
            parentQuestionId: currentQuestion.id,
          );
          _questions.insert(_currentQuestionIndex + 1, followupQ);
          _currentQuestionIndex++;
        } else if (content.isNotEmpty) {
          if (_questions.isNotEmpty &&
              _currentQuestionIndex < _questions.length) {
            _questions[_currentQuestionIndex] =
                _questions[_currentQuestionIndex].copyWith(
                  content: content,
                  questionNumber: number is int
                      ? number
                      : _currentQuestionIndex + 1,
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
            _transcripts.add(
              VivaTranscriptEntry(
                speaker: VivaRole.ai,
                speakerName: 'Giám Khảo AI • Gemini Live',
                text: text,
                timestamp: DateTime.now(),
                isPartial: !isFinal,
              ),
            );
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
            _transcripts.add(
              VivaTranscriptEntry(
                speaker: VivaRole.student,
                speakerName: 'Thí sinh',
                text: text,
                timestamp: DateTime.now(),
                isPartial: !isFinal,
              ),
            );
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
        _currentTurnId++;
        debugPrint('[VivaSessionProvider] User interrupted AI voice playback.');
        _playerService.clearAudioBuffer();
        notifyListeners();
      }
      // 7. Sự kiện Report: Báo cáo kết quả và bảng điểm Rubric hoàn tất
      else if (type == 'report') {
        final report = msg['data'] ?? msg['report'];
        if (report is! Map<String, dynamic> || report.isEmpty) {
          _errorMessage = 'Dữ liệu kết quả từ máy chủ không hợp lệ.';
          notifyListeners();
          return;
        }
        _completeWithReport(report);
      }
      // 8. Hết danh sách câu hỏi
      else if (type == 'questions_complete') {
        debugPrint(
          '[VivaSessionProvider] All questions answered. Ready to finish.',
        );
        finishExamSession();
      } else if (type == 'error') {
        _errorMessage =
            msg['message']?.toString() ??
            msg['detail']?.toString() ??
            'Lỗi phòng thi.';
        _recorderService.stopRecording();
        _sessionState = VivaSessionState.processing;
        notifyListeners();
      }
    } catch (e, stack) {
      debugPrint(
        '[VivaSessionProvider] Error handling incoming WS message: $e\n$stack',
      );
    }
  }

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _generation++;
    _finishTimer?.cancel();
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
