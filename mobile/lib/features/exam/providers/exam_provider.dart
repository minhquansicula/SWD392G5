import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../models/exam_schedule_model.dart';

class ExamProvider extends ChangeNotifier {
  List<ExamScheduleModel> _exams = ExamScheduleModel.getMockExams();
  bool _isLoading = false;
  ExamScheduleModel? _selectedExam;

  List<ExamScheduleModel> get exams => _exams;
  bool get isLoading => _isLoading;
  ExamScheduleModel? get selectedExam => _selectedExam ?? (_exams.isNotEmpty ? _exams.first : null);

  ExamScheduleModel? get upcomingHeroExam {
    try {
      return _exams.firstWhere((e) => e.status == ExamStatus.upcoming);
    } catch (_) {
      return null;
    }
  }

  List<ExamScheduleModel> get completedExams {
    return _exams.where((e) => e.status == ExamStatus.completed).toList();
  }

  void selectExam(ExamScheduleModel exam) {
    _selectedExam = exam;
    notifyListeners();
  }

  /// Tải danh sách ca thi của sinh viên từ Spring Boot: GET /api/student/my-schedules
  Future<void> refreshExams() async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await ApiClient.instance.get(ApiEndpoints.studentMySchedules);

      if (res.success && res.data is List) {
        final list = res.data as List;
        if (list.isNotEmpty) {
          _exams = list
              .map((item) => ExamScheduleModel.fromJson(item as Map<String, dynamic>))
              .toList();
          debugPrint('[ExamProvider] Loaded ${_exams.length} schedules from Spring Boot Backend.');
        } else {
          // Nếu CSDL chưa gán ca thi cho tài khoản này, giữ danh sách mẫu
          _exams = ExamScheduleModel.getMockExams();
        }
      } else {
        // Backend offline hoặc chưa có token -> fallback sang dữ liệu mẫu an toàn
        _exams = ExamScheduleModel.getMockExams();
      }
    } catch (e) {
      debugPrint('[ExamProvider] Error loading exams from Backend: $e. Fallback to mock.');
      _exams = ExamScheduleModel.getMockExams();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Báo cho Spring Boot biết sinh viên bắt đầu thi: POST /api/student/schedules/{id}/start
  Future<bool> startExamOnBackend(String scheduleId) async {
    try {
      final res = await ApiClient.instance.post(
        '${ApiEndpoints.studentScheduleStart}/$scheduleId/start',
      );
      return res.success;
    } catch (e) {
      debugPrint('[ExamProvider] Start exam error: $e');
      return false;
    }
  }
}
