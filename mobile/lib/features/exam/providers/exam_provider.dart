import 'package:flutter/material.dart';
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

  Future<void> refreshExams() async {
    _isLoading = true;
    notifyListeners();
    await Future.delayed(const Duration(milliseconds: 500));
    _exams = ExamScheduleModel.getMockExams();
    _isLoading = false;
    notifyListeners();
  }
}
