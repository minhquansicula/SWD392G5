import 'package:flutter/material.dart';
import '../models/viva_report_model.dart';

class ReportProvider extends ChangeNotifier {
  VivaReportModel? _latestReport = VivaReportModel.getSampleReport();
  final List<VivaReportModel> _pastReports = [VivaReportModel.getSampleReport()];
  bool _isLoading = false;

  VivaReportModel? get latestReport => _latestReport;
  List<VivaReportModel> get pastReports => _pastReports;
  bool get isLoading => _isLoading;

  Future<void> fetchReportForExam(String examId) async {
    _isLoading = true;
    notifyListeners();

    await Future.delayed(const Duration(milliseconds: 500));
    _latestReport = VivaReportModel.getSampleReport();
    _isLoading = false;
    notifyListeners();
  }
}
