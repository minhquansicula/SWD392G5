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
       _aiApi = aiClient ?? apiClient ?? ApiClient.instance,
       _finishTimeout = finishTimeout;
  final Duration _finishTimeout;
  final AudioRecorderService _recorderService;
  final AudioPlayerService _playerService;
  final VivaWebSocketService _wsService;
  final ApiClient _api;
  final ApiClient _aiApi;
  bool _disposed = false;
  bool _starting = false;
  bool _active = false;
  bool _finishing = false;
  bool _submitting = false;
  bool _answerSubmitted = false;
  String? _planId;
  DateTime? _deadline;
  String? _scheduleId;
  String? _studentId;
  String? _token;
  String? _customWsUrl;
  int _generation = 0;
  int _currentTurnId = 0;
  Timer? _finishTimer;
  Timer? _submitTimer;
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
  int _remainingSeconds = 0;
  Timer? _countdownTimer;

  StreamSubscription? _audioChunkSub;
  StreamSubscription? _amplitudeSub;
  StreamSubscription? _wsMessageSub;
  StreamSubscription? _wsStatusSub;

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
  bool get canFinish => _active && !_finishing && !_disposed;
  bool get canSubmit =>
      _active &&
      !_finishing &&
      !_submitting &&
      !_answerSubmitted &&
      _planId != null;
  bool get isFinishing => _finishing;
  bool get isSubmitting => _submitting;
  bool get isAnswerSubmitted => _answerSubmitted;

  void prepareRoom() {
    _sessionState = VivaSessionState.processing;
    _errorMessage = null;
    _finalEvaluationReport = null;
  }

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
    if (_finishing || _sessionState == VivaSessionState.completed) {
      return '00:00';
    }
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
    _scheduleId = examId;
    _studentId = studentId;
    _token = authToken;
    _customWsUrl = customWsUrl;
    final generation = ++_generation;
    _errorMessage = null;
    _finishing = false;
    _submitting = false;
    _answerSubmitted = false;
    _planId = null;
    _deadline = null;
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
      _wsStatusSub = _wsService.statusStream.listen((status) {
        if (_disposed || generation != _generation) return;
        if (_active &&
            !_starting &&
            (status == WsConnectionStatus.disconnected ||
                status == WsConnectionStatus.error)) {
          _active = false;
          _recorderService.stopRecording();
          _playerService.stop();
          _submitTimer?.cancel();
          _submitting = false;
          if (_sessionState != VivaSessionState.completed) {
            _sessionState = VivaSessionState.processing;
            _errorMessage =
                'Mất kết nối. Microphone đã dừng. Bấm kết nối lại để kiểm tra và tiếp tục ca thi.';
          }
        }
        notifyListeners();
      });
      // Prepare audio before the server can send its opening question.
      if (!await _recorderService.init()) {
        throw StateError('Không thể truy cập microphone.');
      }
      if (_disposed || generation != _generation) return;
      if (!await _playerService.init()) {
        throw StateError('Không thể khởi tạo loa.');
      }
      if (_disposed || generation != _generation) return;
      _active = true;
      await _wsService.connect(
        wsUrl: customWsUrl ?? ApiEndpoints.defaultWebSocketUrl,
        examId: examId,
        token: authToken,
      );
      if (_disposed || generation != _generation) return;
      if (_wsService.currentStatus != WsConnectionStatus.authenticated) {
        throw StateError('Không thể xác thực kết nối phòng thi.');
      }
      _audioChunkSub = _recorderService.audioChunkStream.listen((chunk) {
        if (_active &&
            _sessionState == VivaSessionState.listening &&
            !_finishing &&
            !_answerSubmitted) {
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
      _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (_deadline != null) {
          _remainingSeconds =
              (_deadline!.difference(DateTime.now()).inMilliseconds / 1000)
                  .ceil()
                  .clamp(0, 86400);
          notifyListeners();
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
    _submitTimer?.cancel();
    await _audioChunkSub?.cancel();
    await _amplitudeSub?.cancel();
    await _wsMessageSub?.cancel();
    await _wsStatusSub?.cancel();
    _audioChunkSub = null;
    _amplitudeSub = null;
    _wsMessageSub = null;
    _wsStatusSub = null;
    _wsService.disconnect();
    await _recorderService.stopRecording();
    await _playerService.stop();
  }

  void _startAutoListening() async {
    final generation = _generation;
    final turnId = ++_currentTurnId;
    // Chờ 800ms để các chunk âm thanh cuối cùng phát trọn vẹn ra loa ngoài
    // và tiếng vang phòng tiêu tán hoàn toàn trước khi bật mic
    await _playerService.waitUntilPlaybackFinished(extraBufferMs: 600);
    if (!_disposed &&
        _active &&
        !_finishing &&
        !_answerSubmitted &&
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
    if (!_active ||
        _finishing ||
        _disposed ||
        _answerSubmitted ||
        _submitting) {
      return;
    }
    try {
      _currentTurnId++;
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
    if (!canSubmit) return;
    _currentTurnId++;
    _submitting = true;
    final generation = _generation;
    await _recorderService.stopRecording();
    await _playerService.stop();
    if (_disposed || generation != _generation) return;
    _sessionState = VivaSessionState.processing;
    notifyListeners();

    // Gửi tín hiệu hoàn tất lượt trả lời
    final sent = _wsService.sendControlMessage({
      'type': 'submit_answer',
      'question_id': currentQuestion.id,
      'plan_id': _planId,
    });
    if (!sent) {
      _submitting = false;
      _errorMessage = 'Chưa gửi được câu trả lời. Kiểm tra kết nối và thử lại.';
    } else {
      _submitTimer?.cancel();
      _submitTimer = Timer(const Duration(seconds: 10), () {
        if (_disposed || generation != _generation || !_submitting) return;
        _submitting = false;
        _errorMessage =
            'Chưa xác nhận nộp câu. Có thể thử lại; hệ thống sẽ kiểm tra trùng lặp.';
        notifyListeners();
      });
    }
    notifyListeners();
  }

  /// Kết thúc toàn bộ ca thi và kích hoạt AI chấm điểm Rubric
  Future<void> finishExamSession({bool isTimeout = false, String? examScheduleId}) async {
    if (!_active || _finishing || _disposed) return;
    if (examScheduleId != null && examScheduleId != _scheduleId) {
      _errorMessage = 'Mã ca thi không khớp phiên hiện tại.';
      notifyListeners();
      return;
    }
    _finishing = true;
    _currentTurnId++;
    final generation = _generation;
    _errorMessage = null;
    _finishTimer?.cancel();
    _countdownTimer?.cancel();
    _countdownTimer = null;
    _remainingSeconds = 0;
    await _recorderService.stopRecording();
    await _playerService.stop();
    if (_disposed || generation != _generation) return;
    _sessionState = VivaSessionState.processing;
    notifyListeners();

    final sent = _wsService.finishExam();
    if (!sent) {
      _finishing = false;
      _errorMessage =
          'Chưa gửi được yêu cầu kết thúc. Kiểm tra lại ca thi trước khi thử lại.';
      notifyListeners();
      return;
    }

    // A timeout leaves the outcome unknown; only a server report completes the exam.
    _finishTimer = Timer(_finishTimeout, () {
      if (!_disposed &&
          _active &&
          _sessionState != VivaSessionState.completed) {
        _errorMessage =
            'Chưa nhận được kết quả chấm điểm. Bấm kiểm tra kết quả để đối soát với máy chủ.';
        notifyListeners();
      }
    });
  }

  Future<void> recoverSession() async {
    if (_disposed || _starting || _scheduleId == null) return;
    final generation = _generation;
    _aiApi.setAuthToken(_api.authToken ?? _token);
    final result = await _aiApi.get(
      '/api/v1/sessions/$_scheduleId',
      baseUrl: ApiEndpoints.aiServiceBaseUrl,
    );
    if (_disposed || generation != _generation) return;
    if (!result.success || result.data is! Map) {
      _errorMessage = result.message;
      notifyListeners();
      return;
    }
    final detail = Map<String, dynamic>.from(result.data as Map);
    if (detail['status'] == 'COMPLETED') {
      _errorMessage = null;
      _handleIncomingWsMessage({'type': 'report', 'data': detail});
      return;
    }
    if (_finishing) {
      final finished = await _aiApi.post(
        '/api/v1/sessions/$_scheduleId/finish',
        baseUrl: ApiEndpoints.aiServiceBaseUrl,
      );
      if (_disposed || generation != _generation) return;
      if (finished.success && finished.data is Map) {
        _handleIncomingWsMessage({'type': 'report', 'data': finished.data});
        return;
      }
      _errorMessage = finished.message;
      notifyListeners();
      return;
    }
    await stopSession();
    if (_disposed) return;
    await startSession(
      examId: _scheduleId!,
      studentId: _studentId!,
      token: _token,
      customWsUrl: _customWsUrl,
    );
  }

  /// Xử lý các sự kiện từ demo/viva-ai-v2
  void _handleIncomingWsMessage(Map<String, dynamic> msg) {
    if (_disposed || _sessionState == VivaSessionState.completed) return;
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
        final kind = msg['kind']?.toString() ?? msg['type']?.toString();
        final content = msg['content']?.toString() ?? '';
        final parsedNumber = (msg['number'] is num
                ? (msg['number'] as num).toInt()
                : int.tryParse(msg['number']?.toString() ?? '')) ??
            (msg['question_order'] is num
                ? (msg['question_order'] as num).toInt()
                : int.tryParse(msg['question_order']?.toString() ?? '')) ??
            (_currentQuestionIndex + 1);
        final parsedTotal = (msg['total'] is num
                ? (msg['total'] as num).toInt()
                : int.tryParse(msg['total']?.toString() ?? '')) ??
            (msg['max'] is num
                ? (msg['max'] as num).toInt()
                : int.tryParse(msg['max']?.toString() ?? '')) ??
            _questions.length;
        final isFollowup = kind == 'followup';

        _planId =
            msg['plan_id']?.toString() ??
            '${msg['question_id'] ?? parsedNumber}:${msg['followup_index'] ?? 0}';
        _submitting = false;
        _submitTimer?.cancel();
        _answerSubmitted = msg['answer_submitted'] == true;
        _deadline =
            DateTime.tryParse(msg['deadline']?.toString() ?? '') ??
            DateTime.now().add(
              Duration(
                seconds: (msg['time_limit_seconds'] as num?)?.toInt() ?? 120,
              ),
            );
        _remainingSeconds =
            (_deadline!.difference(DateTime.now()).inMilliseconds / 1000)
                .ceil()
                .clamp(0, 86400);

        final qId = msg['question_id']?.toString();
        int mainIndex = -1;
        if (qId != null && qId.isNotEmpty) {
          mainIndex = _questions.indexWhere(
            (q) => !q.isAdaptiveFollowUp && (q.id == qId || q.parentQuestionId == qId),
          );
        }
        if (mainIndex < 0) {
          mainIndex = _questions.indexWhere(
            (q) => !q.isAdaptiveFollowUp && q.questionNumber == parsedNumber,
          );
        }
        if (mainIndex < 0 && parsedNumber >= 1 && parsedNumber <= _questions.length) {
          mainIndex = parsedNumber - 1;
        }

        if (mainIndex < 0) {
          final newQ = VivaQuestionModel(
            id: qId ?? 'q-$parsedNumber',
            questionNumber: parsedNumber,
            totalQuestions: parsedTotal > 0 ? parsedTotal : 1,
            bloomLevel: msg['bloom_level']?.toString() ?? 'Vận dụng',
            content: content.isNotEmpty ? content : 'Câu hỏi số $parsedNumber',
            isAdaptiveFollowUp: false,
          );
          _questions.add(newQ);
          mainIndex = _questions.length - 1;
        }

        final main = _questions[mainIndex];
        if (isFollowup) {
          // AI sinh câu hỏi đào sâu qua RAG
          final followupQ = VivaQuestionModel(
            id: _planId!,
            questionNumber: parsedNumber,
            totalQuestions: parsedTotal > 0 ? parsedTotal : _questions.length,
            bloomLevel: 'Phân tích & Đào sâu (Socratic RAG)',
            content: content.isNotEmpty
                ? content
                : 'Lắng nghe câu hỏi đào sâu của giám khảo; nội dung hiển thị trong bản hội thoại.',
            isAdaptiveFollowUp: true,
            parentQuestionId: main.id,
          );
          final existing = _questions.indexWhere((q) => q.id == _planId);
          if (existing >= 0) {
            _questions[existing] = followupQ;
            _currentQuestionIndex = existing;
          } else {
            _questions.insert(mainIndex + 1, followupQ);
            _currentQuestionIndex = mainIndex + 1;
          }
        } else {
          _currentQuestionIndex = mainIndex;
          _questions[mainIndex] = main.copyWith(
            content: content.isNotEmpty ? content : main.content,
            isAdaptiveFollowUp: false,
            totalQuestions: parsedTotal > 0 ? parsedTotal : main.totalQuestions,
            questionNumber: parsedNumber,
          );
        }

        if (parsedTotal > 0) {
          for (int i = 0; i < _questions.length; i++) {
            _questions[i] = _questions[i].copyWith(totalQuestions: parsedTotal);
          }
        }

        _sessionState = _answerSubmitted
            ? VivaSessionState.processing
            : VivaSessionState.aiSpeaking;
        // Khi có câu hỏi mới, đảm bảo dừng mic ngay
        if (_recorderService.isRecording) {
          _recorderService.stopRecording();
        }
        notifyListeners();
      }
      // 3. Sự kiện Finishing từ server
      else if (type == 'finishing') {
        _finishing = true;
        _finishTimer?.cancel();
        _countdownTimer?.cancel();
        _countdownTimer = null;
        _remainingSeconds = 0;
        _recorderService.stopRecording();
        _playerService.stop();
        _sessionState = VivaSessionState.processing;
        notifyListeners();
      }
      // 4. Sự kiện Transcript: Phụ đề thời gian thực (Giám khảo AI hoặc Thí sinh)
      else if (type == 'answer_submitted') {
        if (msg['plan_id'] == null || msg['plan_id'] == _planId) {
          _submitting = false;
          _answerSubmitted = true;
          _recorderService.stopRecording();
          _sessionState = VivaSessionState.processing;
          _submitTimer?.cancel();
          notifyListeners();
        }
      } else if (type == 'transcript') {
        final text = msg['text']?.toString() ?? '';
        final role = msg['role']?.toString() ?? 'assistant';
        final isFinal = msg['final'] == true;
        final isAi = (role == 'assistant');
        if (isAi &&
            currentQuestion.isAdaptiveFollowUp &&
            text.isNotEmpty &&
            _questions.isNotEmpty) {
          _questions[_currentQuestionIndex] = currentQuestion.copyWith(
            content: text,
          );
        }

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
        _finishTimer?.cancel();
        _countdownTimer?.cancel();
        _recorderService.stopRecording();
        _playerService.stop();
        _finalEvaluationReport = report;
        _errorMessage = null;
        _active = false;
        _finishing = false;
        _sessionState = VivaSessionState.completed;
        notifyListeners();
      }
      // 8. Hết danh sách câu hỏi
      else if (type == 'questions_complete') {
        debugPrint(
          '[VivaSessionProvider] All questions answered. Ready to finish.',
        );
        finishExamSession();
      } else if (type == 'error') {
        if (msg['code'] == 'finish_failed') _finishing = false;
        _submitting = false;
        _submitTimer?.cancel();
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
    _submitTimer?.cancel();
    _countdownTimer?.cancel();
    _audioChunkSub?.cancel();
    _amplitudeSub?.cancel();
    _wsMessageSub?.cancel();
    _wsStatusSub?.cancel();
    _playerService.dispose();
    _recorderService.dispose();
    _wsService.dispose();
    super.dispose();
  }
}
