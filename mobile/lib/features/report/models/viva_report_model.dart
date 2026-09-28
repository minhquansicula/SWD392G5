class RubricCriterion {
  final String title;
  final String englishTitle;
  final double score;
  final double maxScore;

  const RubricCriterion({
    required this.title,
    required this.englishTitle,
    required this.score,
    this.maxScore = 10.0,
  });

  double get percentage => (score / maxScore).clamp(0.0, 1.0);
}

class QuestionReportItem {
  final int questionNumber;
  final String title;
  final String fullQuestion;
  final String studentAnswer;
  final double score;
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
  final String gradeRank; // Hạng Ưu tú
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

  static VivaReportModel getSampleReport() {
    return VivaReportModel(
      id: 'rep-swd392-01',
      examTitle: 'Final Viva Defense',
      courseCode: 'SWD392',
      courseName: 'Software Architecture',
      examDate: DateTime(2026, 10, 24),
      totalScore: 8.5,
      maxScore: 10.0,
      gradeRank: 'Hạng Ưu tú',
      isPassed: true,
      verifiedByLecturer: 'TS. Nguyễn Văn A (Đã ký duyệt)',
      rubricCriteria: const [
        RubricCriterion(
          title: 'Kiến thức cốt lõi',
          englishTitle: 'Core Knowledge',
          score: 9.0,
        ),
        RubricCriterion(
          title: 'Tư duy phản biện & giải pháp',
          englishTitle: 'Critical Thinking',
          score: 8.0,
        ),
        RubricCriterion(
          title: 'Kỹ năng phản biện & bảo vệ luận điểm',
          englishTitle: 'Defense Skills',
          score: 8.5,
        ),
      ],
      strengths: const [
        'Nắm vững nguyên lý loose coupling trong microservices và giải thích rõ ràng kiến trúc Event-Driven.',
        'Trình bày mạch lạc, tự tin khi đối đáp với các câu hỏi đào sâu từ Giám khảo AI.',
      ],
      improvements: const [
        'Cần phân tích sâu hơn về chi phí duy trì tính nhất quán dữ liệu (Distributed Transactions / Saga pattern).',
        'Cần làm rõ thêm chiến lược quản lý log tập trung trong hạ tầng phân tán.',
      ],
      questionReports: const [
        QuestionReportItem(
          questionNumber: 1,
          title: 'Kiến trúc Microservices vs Monolith',
          fullQuestion: 'Hãy giải thích sự khác biệt cốt lõi giữa kiến trúc Monolithic và Microservices trong việc mở rộng quy mô hệ thống (Scalability)?',
          studentAnswer: 'Đối với kiến trúc Monolithic, khi tải lượng tăng thì toàn bộ ứng dụng phải được nhân bản đồng loạt, dẫn đến lãng phí tài nguyên. Trong khi đó, Microservices cho phép scale độc lập từng module nghiệp vụ đang bị nghẽn...',
          score: 2.3,
          maxScore: 2.5,
          audioDuration: '01:45',
          bloomLevel: 'Hiểu (Understand)',
        ),
        QuestionReportItem(
          questionNumber: 2,
          title: 'Eventual Consistency & Saga Pattern',
          fullQuestion: 'Làm thế nào để đảm bảo tính nhất quán dữ liệu giữa các microservices khi không thể dùng ACID transaction thông thường?',
          studentAnswer: 'Có thể áp dụng mô hình Saga Pattern bằng cách chia transaction lớn thành chuỗi các local transaction. Nếu một bước thất bại, hệ thống thực thi compensation transaction...',
          score: 1.8,
          maxScore: 2.5,
          audioDuration: '02:10',
          bloomLevel: 'Phân tích (Analyze)',
          isFollowUp: true,
        ),
        QuestionReportItem(
          questionNumber: 3,
          title: 'API Gateway & Service Discovery',
          fullQuestion: 'Trong hệ thống Microservices, hãy nêu vai trò của API Gateway và cách triển khai Rate Limiting?',
          studentAnswer: 'API Gateway đóng vai trò entry point duy nhất tiếp nhận request từ client, thực hiện reverse proxy, routing và rate limiting bằng thuật toán Token Bucket...',
          score: 2.2,
          maxScore: 2.5,
          audioDuration: '01:12',
          bloomLevel: 'Vận dụng (Apply)',
        ),
        QuestionReportItem(
          questionNumber: 4,
          title: 'Bảo mật JWT & Distributed Session',
          fullQuestion: 'Chiến lược thu hồi token JWT khi người dùng thay đổi mật khẩu hoặc đăng xuất toàn bộ thiết bị?',
          studentAnswer: 'Sử dụng Token Blacklist lưu trên Redis với TTL bằng thời hạn còn lại của JWT, hoặc lưu token_version trên database để invalidate các token cũ...',
          score: 2.2,
          maxScore: 2.5,
          audioDuration: '01:30',
          bloomLevel: 'Vận dụng (Apply)',
        ),
      ],
    );
  }
}
