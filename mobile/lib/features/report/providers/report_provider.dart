import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../exam/models/exam_schedule_model.dart';
import '../models/viva_report_model.dart';

class ReportProvider extends ChangeNotifier {
  VivaReportModel? _latestReport;
  final List<VivaReportModel> _pastReports = [];
  bool _isLoading = false;

  VivaReportModel? get latestReport => _latestReport;
  List<VivaReportModel> get pastReports => _pastReports;
  bool get isLoading => _isLoading;

  void setReportFromExam(ExamScheduleModel exam) {
    _latestReport = VivaReportModel.fromExam(exam);
    notifyListeners();
  }

  /// Tải kết quả bài thi từ danh sách ca thi của sinh viên: GET /api/student/my-schedules
  Future<void> fetchReportForExam(String examId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await ApiClient.instance.get(ApiEndpoints.studentMySchedules);
      if (res.success && res.data is List) {
        final list = (res.data as List)
            .map((item) => ExamScheduleModel.fromJson(item as Map<String, dynamic>))
            .toList();

        final match = list.where((e) => e.id == examId).toList();
        if (match.isNotEmpty) {
          _latestReport = VivaReportModel.fromExam(match.first);
        } else if (list.isNotEmpty) {
          _latestReport = VivaReportModel.fromExam(list.first);
        }
      }
    } catch (e) {
      debugPrint('[ReportProvider] Error loading report from schedules: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
