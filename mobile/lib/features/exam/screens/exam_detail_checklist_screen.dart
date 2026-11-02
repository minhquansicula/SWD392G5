import 'dart:async';
import 'package:intl/intl.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/app_content.dart';
import '../../../core/widgets/voice_wave_visualizer.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/exam_schedule_model.dart';
import '../providers/exam_provider.dart';
import '../../viva_session/screens/viva_room_screen.dart';
import '../../viva_session/services/audio_recorder_service.dart';
import '../../report/screens/exam_result_report_screen.dart';

class ExamDetailChecklistScreen extends StatefulWidget {
  final ExamScheduleModel exam;
  final ApiClient? apiClient;

  const ExamDetailChecklistScreen({
    super.key,
    required this.exam,
    this.apiClient,
  });

  @override
  State<ExamDetailChecklistScreen> createState() =>
      _ExamDetailChecklistScreenState();
}

class _ExamDetailChecklistScreenState extends State<ExamDetailChecklistScreen> {
  // Trạng thái kiểm tra hệ thống tự động (Automated Pre-Flight System Check)
  bool _isCheckingSystem = true;
  bool _micPermissionGranted = false;
  bool _serverConnectionReady = false;
  bool _profileVerified = false;

  // Cam kết nội quy phòng thi (duy nhất thí sinh xác nhận)
  bool _rulesAgreed = false;
  Timer? _clock;

  // Trạng thái kiểm tra giọng nói thật qua microphone phần cứng
  final AudioRecorderService _audioRecorder = AudioRecorderService();
  bool _isTestingMic = false;
  double _testAudioLevel = 0.0;
  StreamSubscription<double>? _amplitudeSubscription;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkIfAlreadyCompleted();
    });
    _runSystemDiagnostics();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  void _checkIfAlreadyCompleted() {
    if (!mounted) return;
    final examProv = context.read<ExamProvider>();
    final matchedExam = examProv.exams.firstWhere(
      (e) => e.id == widget.exam.id,
      orElse: () => widget.exam,
    );
    if (matchedExam.status == ExamStatus.completed ||
        widget.exam.status == ExamStatus.completed) {
      debugPrint(
        '[ExamChecklist] Exam already completed. Auto-redirecting to report screen.',
      );
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => ExamResultReportScreen(
            exam: matchedExam.copyWith(status: ExamStatus.completed),
          ),
        ),
      );
    }
  }

  @override
  void dispose() {
    _amplitudeSubscription?.cancel();
    _clock?.cancel();
    _audioRecorder.dispose();
    super.dispose();
  }

  /// Hệ thống tự động kiểm tra điều kiện dự thi
  Future<void> _runSystemDiagnostics() async {
    final expectedId = context.read<AuthProvider>().currentUser?.id;
    setState(() {
      _isCheckingSystem = true;
      _serverConnectionReady = false;
      _profileVerified = false;
    });

    try {
      // 1. Tự động kiểm tra quyền Microphone
      final micStatus = await Permission.microphone.status;
      _micPermissionGranted = micStatus.isGranted;

      final responses = await Future.wait([
        (widget.apiClient ?? ApiClient.instance).get(ApiEndpoints.currentUser),
        (widget.apiClient ?? ApiClient.instance).get(
          '/health',
          baseUrl: ApiEndpoints.aiServiceBaseUrl,
        ),
      ]);
      if (!mounted) return;
      final identity = responses[0];
      final health = responses[1];
      _profileVerified =
          identity.success &&
          identity.data is Map &&
          identity.data['id'] == expectedId &&
          identity.data['role'] == 'STUDENT';
      _serverConnectionReady =
          health.success && health.data is Map && health.data['status'] == 'UP';
    } catch (e) {
      debugPrint('[ExamChecklist] Error during system diagnostics: $e');
    } finally {
      if (mounted) {
        setState(() => _isCheckingSystem = false);
      }
    }
  }

  /// Yêu cầu cấp quyền Microphone nếu chưa có
  Future<void> _requestMicPermission() async {
    final status = await Permission.microphone.request();
    if (mounted) {
      setState(() {
        _micPermissionGranted = status.isGranted;
      });
      if (status.isPermanentlyDenied) {
        openAppSettings();
      }
    }
  }

  Future<void> _toggleMicTest() async {
    if (_isTestingMic) {
      // Dừng thu thử mic thật
      await _amplitudeSubscription?.cancel();
      _amplitudeSubscription = null;
      await _audioRecorder.stopRecording();
      if (mounted) {
        setState(() {
          _isTestingMic = false;
          _testAudioLevel = 0.0;
        });
      }
    } else {
      // Khởi động mic thật
      final initialized = await _audioRecorder.init();
      if (!initialized) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Không thể truy cập Microphone. Vui lòng cấp quyền.',
              ),
            ),
          );
        }
        return;
      }

      await _amplitudeSubscription?.cancel();
      _amplitudeSubscription = _audioRecorder.amplitudeStream.listen((level) {
        if (mounted) {
          setState(() {
            _testAudioLevel = level;
          });
        }
      });

      try {
        await _audioRecorder.startRecording();
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Chưa thu được âm thanh từ microphone. Vui lòng thử lại.',
              ),
            ),
          );
        }
        return;
      }
      if (mounted) {
        setState(() {
          _isTestingMic = true;
          _micPermissionGranted = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentExam =
        context
            .watch<ExamProvider>()
            .exams
            .where((e) => e.id == widget.exam.id)
            .firstOrNull ??
        widget.exam;
    final completed = currentExam.status == ExamStatus.completed;
    final now = DateTime.now();
    final inWindow =
        !now.isBefore(currentExam.scheduledAt) &&
        (currentExam.scheduledEndAt == null ||
            now.isBefore(currentExam.scheduledEndAt!));
    final ready =
        !_isCheckingSystem &&
        _micPermissionGranted &&
        _serverConnectionReady &&
        _profileVerified;
    return Scaffold(
      appBar: AppBar(title: const Text('Chuẩn bị thi')),
      body: SafeArea(
        child: AppContent(
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 16),
            children: [
              Text(
                currentExam.courseCode,
                style: AppTextStyles.labelBold.copyWith(
                  color: AppColors.primaryLight,
                ),
              ),
              const SizedBox(height: 8),
              Text(currentExam.examTitle, style: AppTextStyles.headlineLg),
              const SizedBox(height: 8),
              Text(currentExam.courseName, style: AppTextStyles.bodyMd),
              const SizedBox(height: 12),
              Text(
                'Bắt đầu: ${DateFormat('dd/MM/yyyy • HH:mm').format(currentExam.scheduledAt)}',
                style: AppTextStyles.bodyMd,
              ),
              if (currentExam.scheduledEndAt != null)
                Text(
                  'Kết thúc: ${DateFormat('dd/MM/yyyy • HH:mm').format(currentExam.scheduledEndAt!)}',
                  style: AppTextStyles.bodyMd,
                ),
              const SizedBox(height: 24),
              if (!inWindow && !completed)
                const AppMessage(
                  message:
                      'Phòng thi chỉ mở trong thời gian được xếp lịch. Kiểm tra lại thời gian trong tab Lịch thi.',
                ),
              const SizedBox(height: 16),
              Text('1. Kiểm tra điều kiện', style: AppTextStyles.headlineMd),
              const SizedBox(height: 12),
              if (_isCheckingSystem) const LinearProgressIndicator(),
              GlassCard(
                child: Column(
                  children: [
                    _check(
                      'Danh tính sinh viên',
                      _profileVerified,
                      'Đăng nhập lại nếu thông tin tài khoản không được xác nhận.',
                    ),
                    const Divider(),
                    _check(
                      'Kết nối máy chủ',
                      _serverConnectionReady,
                      'Kiểm tra mạng rồi bấm kiểm tra lại.',
                    ),
                    const Divider(),
                    _check(
                      'Quyền microphone',
                      _micPermissionGranted,
                      'Cấp quyền microphone để trả lời câu hỏi.',
                    ),
                    if (!_micPermissionGranted)
                      TextButton(
                        onPressed: _requestMicPermission,
                        child: const Text('Cấp quyền microphone'),
                      ),
                  ],
                ),
              ),
              TextButton.icon(
                onPressed: _isCheckingSystem ? null : _runSystemDiagnostics,
                icon: const Icon(Icons.refresh),
                label: const Text('Kiểm tra lại'),
              ),
              const SizedBox(height: 16),
              Text('2. Thử microphone', style: AppTextStyles.headlineMd),
              const SizedBox(height: 12),
              GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Nói một câu ngắn và quan sát tín hiệu âm thanh.',
                      style: AppTextStyles.bodyMd,
                    ),
                    const SizedBox(height: 16),
                    Semantics(
                      label: _isTestingMic
                          ? 'Microphone đang thu âm'
                          : 'Microphone chưa thu âm',
                      child: VoiceWaveVisualizer(
                        isActive: _isTestingMic,
                        level: _testAudioLevel,
                      ),
                    ),
                    const SizedBox(height: 16),
                    PrimaryButton(
                      text: _isTestingMic
                          ? 'Dừng thử microphone'
                          : 'Thử microphone',
                      icon: _isTestingMic ? Icons.stop : Icons.mic_outlined,
                      isOutlined: true,
                      onPressed: _toggleMicTest,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text('3. Xác nhận nội quy', style: AppTextStyles.headlineMd),
              const SizedBox(height: 12),
              Text(
                'Thi tại nơi yên tĩnh, tự trả lời và không sử dụng tài liệu trái phép. Chỉ kết thúc bài khi bạn đã sẵn sàng nộp.',
                style: AppTextStyles.bodyMd,
              ),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                title: const Text('Tôi đã đọc và đồng ý với nội quy thi.'),
                value: _rulesAgreed,
                onChanged: (value) =>
                    setState(() => _rulesAgreed = value ?? false),
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                text: completed ? 'Xem kết quả' : 'Vào phòng thi',
                icon: Icons.arrow_forward,
                onPressed: completed
                    ? () => Navigator.of(context).pushReplacement(
                        MaterialPageRoute(
                          builder: (_) =>
                              ExamResultReportScreen(exam: currentExam),
                        ),
                      )
                    : ready && inWindow && _rulesAgreed
                    ? () async {
                        if (_isTestingMic) await _toggleMicTest();
                        if (!context.mounted) return;
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => VivaRoomScreen(exam: currentExam),
                          ),
                        );
                      }
                    : null,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _check(String title, bool passed, String hint) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          passed ? Icons.check_circle_outline : Icons.info_outline,
          color: passed ? AppColors.success : AppColors.warning,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTextStyles.labelBold),
              Text(
                _isCheckingSystem
                    ? 'Đang kiểm tra…'
                    : passed
                    ? 'Sẵn sàng'
                    : hint,
                style: AppTextStyles.bodyMd,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
