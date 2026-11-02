import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../models/exam_schedule_model.dart';

class ExamProvider extends ChangeNotifier {
  final ApiClient _api;
  int _requestVersion = 0;
  bool _disposed = false;
  List<ExamScheduleModel> _exams = [];
  bool _isLoading = false;
  String? _errorMessage;
  ExamScheduleModel? _selectedExam;

  ExamProvider({ApiClient? apiClient, bool autoLoad = true})
    : _api = apiClient ?? ApiClient.instance {
    if (autoLoad && _api.authToken != null && _api.authToken!.isNotEmpty) {
      refreshExams();
    }
  }

  List<ExamScheduleModel> get exams => _exams;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  ExamScheduleModel? get selectedExam =>
      _selectedExam ?? (_exams.isNotEmpty ? _exams.first : null);

  /// Ca thi đang hoạt động (Đang thi dở dang hoặc Sắp diễn ra) cần hiển thị trên Hero Card
  ExamScheduleModel? get activeHeroExam {
    final inProgress = _exams
        .where((e) => e.status == ExamStatus.inProgress)
        .toList();
    if (inProgress.isNotEmpty) {
      return inProgress.first;
    }
    final upcoming = _exams
        .where((e) => e.status == ExamStatus.upcoming)
        .toList();
    if (upcoming.isNotEmpty) {
      return upcoming.first;
    }
    return null;
  }

  ExamScheduleModel? get upcomingHeroExam => activeHeroExam;

  List<ExamScheduleModel> get completedExams {
    final list = _exams.where((e) => e.status == ExamStatus.completed).toList();
    list.sort((a, b) {
      final timeA = a.actualEndTime ?? a.actualStartTime ?? a.scheduledEndAt ?? a.scheduledAt;
      final timeB = b.actualEndTime ?? b.actualStartTime ?? b.scheduledEndAt ?? b.scheduledAt;
      return timeB.compareTo(timeA);
    });
    return list;
  }

  void selectExam(ExamScheduleModel exam) {
    _selectedExam = exam;
    notifyListeners();
  }

  /// Tải danh sách ca thi của sinh viên từ Spring Boot: GET /api/student/my-schedules
  Future<void> refreshExams() async {
    final version = ++_requestVersion;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.get(ApiEndpoints.studentMySchedules);
      if (_disposed || version != _requestVersion) return;

      if (res.success && res.data is List) {
        final list = res.data as List;
        _exams = list
            .map(
              (item) =>
                  ExamScheduleModel.fromJson(item as Map<String, dynamic>),
            )
            .toList();
        final selectedId = _selectedExam?.id;
        _selectedExam = null;
        for (final exam in _exams) {
          if (exam.id == selectedId) _selectedExam = exam;
        }
        debugPrint(
          '[ExamProvider] Loaded ${_exams.length} schedules from Spring Boot Backend.',
        );
      } else {
        _exams = [];
        _selectedExam = null;
        _errorMessage = res.message.isNotEmpty
            ? res.message
            : 'Không thể tải lịch thi từ máy chủ.';
      }
    } catch (e) {
      if (_disposed || version != _requestVersion) return;
      debugPrint('[ExamProvider] Error loading exams from Backend: $e');
      _exams = [];
      _selectedExam = null;
      _errorMessage = 'Lỗi kết nối máy chủ backend.';
    } finally {
      if (!_disposed && version == _requestVersion) {
        _isLoading = false;
        notifyListeners();
      }
    }
  }

  /// Báo cho Spring Boot biết sinh viên bắt đầu thi: POST /api/student/schedules/{id}/start
  Future<bool> startExamOnBackend(String scheduleId, {ApiClient? apiClient}) async {
    final version = _requestVersion;
    try {
      if (scheduleId.trim().isEmpty) return false;
      final res = await (apiClient ?? _api).post(
        '${ApiEndpoints.studentScheduleStart}/$scheduleId/start',
        body: {},
      );
      if (_disposed || version != _requestVersion) return false;
      if (!res.success || res.data is! Map<String, dynamic>) {
        _errorMessage = res.message;
        notifyListeners();
        return false;
      }
      final started = ExamScheduleModel.fromJson(
        res.data as Map<String, dynamic>,
      );
      _exams = [
        for (final exam in _exams)
          if (exam.id == started.id) started else exam,
      ];
      _selectedExam = started;
      _errorMessage = null;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('[ExamProvider] Start exam error: $e');
      return false;
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _requestVersion++;
    super.dispose();
  }
}
