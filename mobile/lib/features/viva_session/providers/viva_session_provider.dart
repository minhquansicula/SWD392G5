import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/audio_pulse_orb.dart';
import '../models/viva_question_model.dart';
import '../services/audio_recorder_service.dart';
import '../services/viva_websocket_service.dart';

enum VivaSessionState {
  aiSpeaking,
  listening,
  processing,
  completed,
}

class VivaSessionProvider extends ChangeNotifier {
  final AudioRecorderService _recorderService = AudioRecorderService();
  final VivaWebSocketService _wsService = VivaWebSocketService();

  List<VivaQuestionModel> _questions = [];
  int _currentQuestionIndex = 0;
  VivaSessionState _sessionState = VivaSessionState.aiSpeaking;

  final List<VivaTranscriptEntry> _transcripts = [];
  double _currentAudioLevel = 0.0;
  final double _acousticAccuracy = 0.968; // 96.8% accuracy from Stitch design

  // 15-minute exam countdown timer (14:52 from Stitch design)
  int _remainingSeconds = 14 * 60 + 52;
  Timer? _countdownTimer;

  StreamSubscription? _audioChunkSub;
  StreamSubscription? _amplitudeSub;
  StreamSubscription? _wsMessageSub;

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
              content: 'Chào mừng bạn đến với phòng thi vấn đáp trực tuyến.',
            );
  VivaSessionState get sessionState => _sessionState;
  List<VivaTranscriptEntry> get transcripts => _transcripts;
  double get currentAudioLevel => _currentAudioLevel;
  double get acousticAccuracy => _acousticAccuracy;
  int get remainingSeconds => _remainingSeconds;
  bool get isRecording => _recorderService.isRecording;
  WsConnectionStatus get wsStatus => _wsService.currentStatus;

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

  Future<void> startSession({
    required String examId,
    required String studentId,
    String? customWsUrl,
  }) async {
    _currentQuestionIndex = 0;
    _transcripts.clear();
    _remainingSeconds = 14 * 60 + 52;

    // Load real assigned questions snapshot from Spring Boot Backend
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
      debugPrint('[VivaSessionProvider] Error fetching assigned questions: $e');
    }

    if (_questions.isEmpty) {
      _questions = const [
        VivaQuestionModel(
          id: 'q-live-01',
          questionNumber: 1,
          totalQuestions: 1,
          bloomLevel: 'Vấn đáp Trực tiếp',
          content: 'Chào mừng bạn đến với phòng thi vấn đáp trực tuyến. AI Examiner đang sẵn sàng.',
        ),
      ];
    }

    // 1. Initialize audio recorder
    await _recorderService.init();

    // 2. Connect WebSocket
    final wsUrl = customWsUrl ?? ApiEndpoints.defaultWebSocketUrl;
    await _wsService.connect(
      wsUrl: wsUrl,
      examId: examId,
      studentId: studentId,
    );

    // 3. Listen to binary audio chunks and stream directly to WebSocket
    _audioChunkSub = _recorderService.audioChunkStream.listen((chunk) {
      _wsService.sendBinaryPcmChunk(chunk);
    });

    // 4. Listen to amplitude for orb visualizer
    _amplitudeSub = _recorderService.amplitudeStream.listen((lvl) {
      _currentAudioLevel = lvl;
      notifyListeners();
    });

    // 5. Listen to WebSocket messages
    _wsMessageSub = _wsService.messageStream.listen(_handleIncomingWsMessage);

    // 6. Start countdown timer
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        _remainingSeconds--;
        notifyListeners();
      } else {
        timer.cancel();
      }
    });

    // 7. Load and speak initial question
    _loadQuestionAt(_currentQuestionIndex);
  }

  void _loadQuestionAt(int index) {
    if (index >= _questions.length) {
      _sessionState = VivaSessionState.completed;
      notifyListeners();
      return;
    }

    _currentQuestionIndex = index;
    _sessionState = VivaSessionState.aiSpeaking;

    final q = _questions[index];
    _transcripts.add(VivaTranscriptEntry(
      speaker: VivaRole.ai,
      speakerName: 'Giám Khảo AI • Câu Hỏi #${q.questionNumber}',
      text: q.content,
      timestamp: DateTime.now(),
    ));
    notifyListeners();

    // Simulate AI reading question via TTS (approx 3.5s) then opening student microphone
    Future.delayed(const Duration(milliseconds: 3200), () {
      if (_sessionState == VivaSessionState.aiSpeaking) {
        _sessionState = VivaSessionState.listening;
        _startAutoListening();
        notifyListeners();
      }
    });
  }

  void _startAutoListening() async {
    await _recorderService.startRecording();
    notifyListeners();
  }

  void toggleMicrophone() async {
    if (_recorderService.isRecording) {
      await _recorderService.stopRecording();
    } else {
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

  void repeatQuestion() {
    _sessionState = VivaSessionState.aiSpeaking;
    notifyListeners();

    _wsService.sendControlMessage({
      'type': 'repeat_question',
      'question_id': currentQuestion.id,
    });

    Future.delayed(const Duration(milliseconds: 2500), () {
      _sessionState = VivaSessionState.listening;
      _startAutoListening();
      notifyListeners();
    });
  }

  Future<void> submitAnswer() async {
    await _recorderService.stopRecording();
    _sessionState = VivaSessionState.processing;
    notifyListeners();

    _wsService.sendControlMessage({
      'type': 'submit_answer',
      'question_id': currentQuestion.id,
      'transcript': _transcripts.isNotEmpty ? _transcripts.last.text : '',
    });

    // Advance to next question or complete exam
    Future.delayed(const Duration(milliseconds: 2000), () {
      if (_currentQuestionIndex + 1 < _questions.length) {
        _loadQuestionAt(_currentQuestionIndex + 1);
      } else {
        finishExamSession();
      }
    });
  }

  /// Kết thúc toàn bộ ca thi và kích hoạt chấm điểm từ AI
  Future<void> finishExamSession() async {
    await _recorderService.stopRecording();
    _sessionState = VivaSessionState.processing;
    notifyListeners();

    _wsService.finishExam();

    // Timeout safety fallback
    Future.delayed(const Duration(milliseconds: 2500), () {
      if (_sessionState != VivaSessionState.completed) {
        _sessionState = VivaSessionState.completed;
        notifyListeners();
      }
    });
  }

  void _handleIncomingWsMessage(Map<String, dynamic> msg) {
    final type = msg['type']?.toString() ?? msg['event']?.toString();
    if (type == 'transcript' || type == 'subtitle_delta') {
      final text = msg['text']?.toString() ?? '';
      final role = msg['role']?.toString() ?? 'EXAMINER';
      final isInterim = msg['is_interim'] == true || msg['is_final'] == false;

      if (role == 'EXAMINER') {
        if (_transcripts.isNotEmpty &&
            _transcripts.last.speaker == VivaRole.ai &&
            _transcripts.last.isPartial) {
          _transcripts[_transcripts.length - 1] = _transcripts.last.copyWith(
            text: _transcripts.last.text + text,
            isPartial: isInterim,
          );
        } else {
          _transcripts.add(VivaTranscriptEntry(
            speaker: VivaRole.ai,
            speakerName: 'Giám Khảo AI • Gemini Live',
            text: text,
            timestamp: DateTime.now(),
            isPartial: isInterim,
          ));
        }
        notifyListeners();
      } else {
        if (_transcripts.isNotEmpty && _transcripts.last.speaker == VivaRole.student) {
          _transcripts[_transcripts.length - 1] = _transcripts.last.copyWith(
            text: text,
            isPartial: isInterim,
          );
          notifyListeners();
        }
      }
    } else if (type == 'turn_complete') {
      if (_sessionState == VivaSessionState.aiSpeaking) {
        _sessionState = VivaSessionState.listening;
        _startAutoListening();
        notifyListeners();
      }
    } else if (type == 'examiner_ready') {
      _sessionState = VivaSessionState.aiSpeaking;
      notifyListeners();
    } else if (type == 'exam_completed') {
      _sessionState = VivaSessionState.completed;
      notifyListeners();
    } else if (type == 'adaptive_follow_up') {
      final qText = msg['content']?.toString() ?? '';
      _questions.insert(
        _currentQuestionIndex + 1,
        VivaQuestionModel(
          id: 'followup-${DateTime.now().millisecondsSinceEpoch}',
          questionNumber: currentQuestion.questionNumber,
          totalQuestions: currentQuestion.totalQuestions,
          bloomLevel: 'Phân tích (Analyze)',
          content: qText,
          isAdaptiveFollowUp: true,
          parentQuestionId: currentQuestion.id,
        ),
      );
      _loadQuestionAt(_currentQuestionIndex + 1);
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _audioChunkSub?.cancel();
    _amplitudeSub?.cancel();
    _wsMessageSub?.cancel();
    _recorderService.dispose();
    _wsService.dispose();
    super.dispose();
  }
}
