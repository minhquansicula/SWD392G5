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

  static List<ExamScheduleModel> getMockExams() {
    final now = DateTime.now();
    return [
      ExamScheduleModel(
        id: 'exam-swd392-final',
        courseCode: 'SWD392',
        courseName: 'Software Architecture',
        examTitle: 'Final Viva Defense (Vấn đáp Cuối kỳ)',
        scheduledAt: now.add(const Duration(minutes: 15)),
        room: 'Phòng ảo AI-04 (Hội đồng 01)',
        timeRemainingText: 'Bắt đầu sau: 15 phút',
        examiners: ['TS. Nguyễn Văn A', 'ThS. Trần Thị B'],
        totalQuestions: 5,
        maxFollowUpsPerQuestion: 2,
        durationMinutes: 15,
        status: ExamStatus.upcoming,
        credits: 3,
      ),
      ExamScheduleModel(
        id: 'exam-prn231-mid',
        courseCode: 'PRN231',
        courseName: 'Building Web Apps with .NET',
        examTitle: 'Midterm Viva Assessment',
        scheduledAt: DateTime(2026, 11, 18, 9, 30),
        room: 'Phòng ảo AI-02',
        timeRemainingText: '18/11/2026',
        examiners: ['GV. Lê Hoàng', 'TS. Phạm Hùng'],
        totalQuestions: 4,
        status: ExamStatus.upcoming,
        credits: 3,
      ),
      ExamScheduleModel(
        id: 'exam-mas291-viva',
        courseCode: 'MAS291',
        courseName: 'Statistics & Probability',
        examTitle: 'Viva Oral Exam',
        scheduledAt: DateTime(2026, 11, 24, 13, 0),
        room: 'Phòng ảo AI-05',
        timeRemainingText: '24/11/2026',
        examiners: ['TS. Lê Hùng'],
        totalQuestions: 3,
        status: ExamStatus.upcoming,
        credits: 3,
      ),
      ExamScheduleModel(
        id: 'exam-swp391-capstone',
        courseCode: 'SWP391',
        courseName: 'Software Project Capstone',
        examTitle: 'Capstone Viva Milestone 2',
        scheduledAt: DateTime(2026, 12, 2, 8, 0),
        room: 'Hội đồng Hội trường Beta',
        timeRemainingText: '02/12/2026',
        examiners: ['TS. Nguyễn Văn A', 'ThS. Đỗ Minh', 'TS. Vũ Nam'],
        totalQuestions: 6,
        status: ExamStatus.upcoming,
        credits: 4,
      ),
      ExamScheduleModel(
        id: 'exam-swd392-mock',
        courseCode: 'SWD392',
        courseName: 'Software Architecture',
        examTitle: 'Thi thử Vấn đáp Demo (AI Practice)',
        scheduledAt: now.subtract(const Duration(days: 2)),
        room: 'Phòng AI Sandbox',
        timeRemainingText: 'Đã hoàn thành',
        examiners: ['AI Examiner Virtual Bot'],
        totalQuestions: 4,
        status: ExamStatus.completed,
        finalScore: 8.5,
        credits: 3,
      ),
    ];
  }
}
