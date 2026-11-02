import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../exam/models/exam_schedule_model.dart';
import '../models/viva_report_model.dart';

class ReportProvider extends ChangeNotifier {
  ReportProvider({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient.instance;
  final ApiClient _api;
  int _requestVersion = 0;
  bool _disposed = false;
  String? _errorMessage;
  VivaReportModel? _latestReport;
  final List<VivaReportModel> _pastReports = [];
  bool _isLoading = false;

  VivaReportModel? get latestReport => _latestReport;
  List<VivaReportModel> get pastReports => _pastReports;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void setReportFromExam(ExamScheduleModel exam) {
    _requestVersion++;
    _isLoading = false;
    _errorMessage = null;
    _latestReport =
        exam.status == ExamStatus.completed && exam.finalScore != null
        ? VivaReportModel.fromExam(exam)
        : null;
    notifyListeners();
  }

  /// Tải kết quả bài thi từ danh sách ca thi của sinh viên: GET /api/student/my-schedules
  Future<void> fetchReportForExam(String examId) async {
    final version = ++_requestVersion;
    _latestReport = null;
    _errorMessage = null;
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _api.get(ApiEndpoints.studentMySchedules);
      if (_disposed || version != _requestVersion) return;
      if (res.success && res.data is List) {
        final list = (res.data as List)
            .map(
              (item) =>
                  ExamScheduleModel.fromJson(item as Map<String, dynamic>),
            )
            .toList();

        final match = list.where((e) => e.id == examId).toList();
        if (match.isNotEmpty) {
          final exam = match.first;
          if (exam.status == ExamStatus.completed && exam.finalScore != null) {
            _latestReport = VivaReportModel.fromExam(exam);
          } else {
            _errorMessage = 'Ca thi chưa có điểm cuối cùng.';
          }
        } else {
          _errorMessage = 'Không tìm thấy ca thi được yêu cầu.';
        }
      } else {
        _errorMessage = res.success
            ? 'Dữ liệu báo cáo không hợp lệ.'
            : res.message;
      }
    } catch (e) {
      debugPrint('[ReportProvider] Error loading report from schedules: $e');
      if (!_disposed && version == _requestVersion) {
        _errorMessage = 'Không thể tải báo cáo.';
      }
    } finally {
      if (!_disposed && version == _requestVersion) {
        _isLoading = false;
        notifyListeners();
      }
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _requestVersion++;
    super.dispose();
  }
}
