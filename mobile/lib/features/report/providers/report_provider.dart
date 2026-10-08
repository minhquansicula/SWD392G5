import 'package:flutter/material.dart';
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

  Future<void> fetchReportForExam(String examId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await ApiClient.instance.get('/reports/student/$examId');
      if (res.success && res.data is Map<String, dynamic>) {
        _latestReport = VivaReportModel.fromJson(res.data as Map<String, dynamic>);
      }
    } catch (e) {
      debugPrint('[ReportProvider] Error loading report: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

