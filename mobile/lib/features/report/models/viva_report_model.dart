import '../../exam/models/exam_schedule_model.dart';

class RubricCriterion {
  final String title;
  final String englishTitle;
  final double? score;
  final double maxScore;

  const RubricCriterion({
    required this.title,
    required this.englishTitle,
    required this.score,
    this.maxScore = 10.0,
  });

  double get percentage =>
      score == null || !score!.isFinite || !maxScore.isFinite || maxScore <= 0
      ? 0.0
      : (score! / maxScore).clamp(0.0, 1.0);
}

class QuestionReportItem {
  final int questionNumber;
  final String title;
  final String fullQuestion;
  final String studentAnswer;
  final double? score;
  final double maxScore;
  final String audioDuration;
  final String bloomLevel;
  final bool isFollowUp;

  const QuestionReportItem({
    required this.questionNumber,
    required this.title,
    required this.fullQuestion,
    required this.studentAnswer,
    required this.score,
    this.maxScore = 2.5,
    required this.audioDuration,
    required this.bloomLevel,
    this.isFollowUp = false,
  });
}

class VivaReportModel {
  final String id;
  final String examTitle;
  final String courseCode;
  final String courseName;
  final DateTime examDate;
  final double totalScore;
  final double maxScore;
  final String gradeRank;
  final bool isPassed;
  final String verifiedByLecturer;
  final List<RubricCriterion> rubricCriteria;
  final List<String> strengths;
  final List<String> improvements;
  final List<QuestionReportItem> questionReports;

  const VivaReportModel({
    required this.id,
    required this.examTitle,
    required this.courseCode,
    required this.courseName,
    required this.examDate,
    required this.totalScore,
    this.maxScore = 10.0,
    required this.gradeRank,
    this.isPassed = true,
    required this.verifiedByLecturer,
    required this.rubricCriteria,
    required this.strengths,
    required this.improvements,
    required this.questionReports,
  });

  factory VivaReportModel.fromExam(ExamScheduleModel exam) {
    final score = exam.finalScore ?? 0.0;
    final isPass = score >= 5.0;
    final rank = score >= 8.5
        ? 'Hạng Giỏi (Excellence)'
        : score >= 7.0
        ? 'Hạng Khá (Good)'
        : score >= 5.0
        ? 'Đạt (Pass)'
        : 'Không đạt (Fail)';

    return VivaReportModel(
      id: exam.id,
      examTitle: exam.examTitle,
      courseCode: exam.courseCode,
      courseName: exam.courseName,
      examDate: exam.scheduledAt,
      totalScore: score,
      maxScore: 10.0,
      gradeRank: rank,
      isPassed: isPass,
      verifiedByLecturer: exam.scorePublished
          ? 'Giảng viên đã chốt điểm'
          : 'Kết quả từ hệ thống',
      rubricCriteria: const [],
      strengths: const [],
      improvements: const [],
      questionReports: const [],
    );
  }

  factory VivaReportModel.fromJson(Map<String, dynamic> json) {
    final score =
        (json['totalScore'] ?? json['finalScore'] as num?)?.toDouble() ?? 0.0;
    final max = (json['maxScore'] as num?)?.toDouble() ?? 10.0;
    final pass = json['isPassed'] is bool
        ? json['isPassed'] as bool
        : score >= 5.0;

    return VivaReportModel(
      id: json['id']?.toString() ?? '',
      examTitle: json['examTitle'] ?? json['title'] ?? 'Báo Cáo Điểm Vấn Đáp',
      courseCode: json['courseCode'] ?? '',
      courseName: json['courseName'] ?? '',
      examDate: json['examDate'] != null
          ? DateTime.tryParse(json['examDate'].toString())?.toLocal() ??
                DateTime.now()
          : DateTime.now(),
      totalScore: score,
      maxScore: max,
      gradeRank:
          json['gradeRank']?.toString() ??
          (score >= 8.5
              ? 'Hạng Giỏi'
              : score >= 7.0
              ? 'Hạng Khá'
              : score >= 5.0
              ? 'Đạt'
              : 'Không đạt'),
      isPassed: pass,
      verifiedByLecturer:
          json['verifiedByLecturer'] ??
          json['gradedBy'] ??
          'Giảng viên chấm thi',
      rubricCriteria:
          (json['rubricCriteria'] as List?)
              ?.map(
                (c) => RubricCriterion(
                  title: c['title'] ?? '',
                  englishTitle: c['englishTitle'] ?? '',
                  score: (c['score'] as num?)?.toDouble(),
                  maxScore: (c['maxScore'] as num?)?.toDouble() ?? 10.0,
                ),
              )
              .toList() ??
          const [],
      strengths:
          (json['strengths'] as List?)?.map((s) => s.toString()).toList() ??
          const [],
      improvements:
          (json['improvements'] as List?)?.map((s) => s.toString()).toList() ??
          const [],
      questionReports:
          (json['questionReports'] as List?)
              ?.map(
                (q) => QuestionReportItem(
                  questionNumber: q['questionNumber'] ?? 1,
                  title: q['title'] ?? '',
                  fullQuestion: q['fullQuestion'] ?? '',
                  studentAnswer: q['studentAnswer'] ?? '',
                  score: (q['score'] as num?)?.toDouble(),
                  maxScore: (q['maxScore'] as num?)?.toDouble() ?? 2.5,
                  audioDuration: q['audioDuration'] ?? '00:00',
                  bloomLevel: q['bloomLevel'] ?? '',
                  isFollowUp: q['isFollowUp'] == true,
                ),
              )
              .toList() ??
          const [],
    );
  }

  factory VivaReportModel.fromSession(
    ExamScheduleModel exam,
    Map<String, dynamic> detail,
  ) {
    final ai = detail['ai_report'] is Map
        ? Map<String, dynamic>.from(detail['ai_report'] as Map)
        : <String, dynamic>{};
    final criteria = (ai['criteria'] as List? ?? []).whereType<Map>().toList();
    final results = (detail['results'] as List? ?? [])
        .whereType<Map>()
        .toList();
    final transcripts = (detail['transcripts'] as List? ?? [])
        .whereType<Map>()
        .toList();
    final questions = (detail['assigned_questions'] as List? ?? [])
        .whereType<Map>()
        .toList();
    return VivaReportModel.fromJson({
      'id': exam.id,
      'examTitle': exam.examTitle,
      'courseCode': exam.courseCode,
      'courseName': exam.courseName,
      'examDate': exam.scheduledAt.toIso8601String(),
      'totalScore': exam.finalScore,
      'verifiedByLecturer': 'Điểm chính thức do giảng viên chốt',
      'rubricCriteria': [
        for (final c in criteria)
          {
            'title': c['name'],
            'englishTitle': 'Đánh giá AI tham khảo',
            'score': c['assessed'] == true ? c['score'] : null,
            'maxScore': 10.0,
          },
      ],
      'strengths': [
        for (final c in criteria)
          if (c['assessed'] == true &&
              (c['rationale']?.toString().isNotEmpty ?? false))
            c['rationale'],
      ],
      'improvements': [
        for (final c in criteria)
          if (c['improvement']?.toString().isNotEmpty ?? false)
            c['improvement'],
      ],
      'questionReports': [
        for (final q in questions)
          {
            'questionNumber': q['order'],
            'title': 'Câu ${q['order']}',
            'fullQuestion': q['content'],
            'studentAnswer': transcripts
                .where(
                  (t) =>
                      t['question_id'] == q['question_id'] &&
                      t['role'] == 'STUDENT',
                )
                .map((t) => t['text']?.toString() ?? '')
                .join('\n'),
            'score': results
                .where((r) => r['question_id'] == q['question_id'])
                .firstOrNull?['ai_score'],
            'maxScore': 10.0,
            'audioDuration': '',
            'bloomLevel': '',
          },
      ],
    });
  }
}
