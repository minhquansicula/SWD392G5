enum ExamStatus {
  upcoming,
  inProgress,
  completed,
}

class ExamScheduleModel {
  final String id;
  final String courseCode;
  final String courseName;
  final String examTitle;
  final DateTime scheduledAt;
  final String room;
  final String timeRemainingText;
  final List<String> examiners;
  final int totalQuestions;
  final int maxFollowUpsPerQuestion;
  final int durationMinutes;
  final ExamStatus status;
  final double? finalScore;
  final int credits;

  const ExamScheduleModel({
    required this.id,
    required this.courseCode,
    required this.courseName,
    required this.examTitle,
    required this.scheduledAt,
    required this.room,
    required this.timeRemainingText,
    required this.examiners,
    this.totalQuestions = 5,
    this.maxFollowUpsPerQuestion = 2,
    this.durationMinutes = 15,
    this.status = ExamStatus.upcoming,
    this.finalScore,
    this.credits = 3,
  });

  factory ExamScheduleModel.fromJson(Map<String, dynamic> json) {
    DateTime scheduledDate = DateTime.now();
    if (json['scheduledStartTime'] != null) {
      try {
        scheduledDate = DateTime.parse(json['scheduledStartTime'].toString());
      } catch (_) {}
    }

    ExamStatus examStatus = ExamStatus.upcoming;
    final statusStr = json['status']?.toString().toUpperCase() ?? 'PENDING';
    if (statusStr == 'COMPLETED') {
      examStatus = ExamStatus.completed;
    } else if (statusStr == 'IN_PROGRESS') {
      examStatus = ExamStatus.inProgress;
    }

    double? score;
    if (json['finalScore'] != null) {
      score = double.tryParse(json['finalScore'].toString());
    }

    return ExamScheduleModel(
      id: json['id']?.toString() ?? '',
      courseCode: json['courseCode']?.toString() ?? 'SWD392',
      courseName: json['courseName']?.toString() ?? 'Phát triển Kiến trúc Phần mềm',
      examTitle: json['examTitle']?.toString() ?? 'Vấn đáp bảo vệ đồ án',
      scheduledAt: scheduledDate,
      room: json['room']?.toString() ?? 'Phòng ảo AI-01',
      timeRemainingText: '${scheduledDate.day}/${scheduledDate.month}/${scheduledDate.year}',
      examiners: ['Hội đồng Giám khảo AI'],
      totalQuestions: json['assignedQuestionCount'] is int ? json['assignedQuestionCount'] : 5,
      status: examStatus,
      finalScore: score,
      credits: 3,
    );
  }
}
