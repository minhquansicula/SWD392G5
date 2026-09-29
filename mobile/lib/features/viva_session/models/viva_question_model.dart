enum VivaRole {
  ai,
  student,
}

class VivaQuestionModel {
  final String id;
  final int questionNumber;
  final int totalQuestions;
  final String bloomLevel; // Nhớ, Hiểu, Vận dụng, Phân tích
  final String content;
  final bool isAdaptiveFollowUp; // Hỏi xoáy / Làm rõ
  final String? parentQuestionId;
  final int timeLimitSeconds;
  final double maxScore;
  final List<String> topicTags;
  final String expectedKeywords;

  const VivaQuestionModel({
    required this.id,
    required this.questionNumber,
    required this.totalQuestions,
    required this.bloomLevel,
    required this.content,
    this.isAdaptiveFollowUp = false,
    this.parentQuestionId,
    this.timeLimitSeconds = 180,
    this.maxScore = 2.5,
    this.topicTags = const [],
    this.expectedKeywords = '',
  });

  static List<VivaQuestionModel> getSampleExamQuestions() {
    return [
      const VivaQuestionModel(
        id: 'q-swd-01',
        questionNumber: 1,
        totalQuestions: 5,
        bloomLevel: 'Hiểu (Understand)',
        content: 'Hãy giải thích sự khác biệt cốt lõi giữa kiến trúc Monolithic và Microservices trong việc mở rộng quy mô hệ thống (Scalability)?',
        topicTags: ['#Scalability', '#Microservices', '#Architecture'],
        expectedKeywords: 'scale độc lập, bottleneck, nhân bản toàn bộ, tài nguyên, loose coupling',
        maxScore: 2.0,
      ),
      const VivaQuestionModel(
        id: 'q-swd-01-followup',
        questionNumber: 1,
        totalQuestions: 5,
        bloomLevel: 'Phân tích (Analyze)',
        content: 'Bạn vừa nhắc đến "Scale độc lập từng service", vậy làm thế nào để đảm bảo tính nhất quán dữ liệu (Data Consistency) giữa các service này khi không thể dùng ACID transaction thông thường?',
        isAdaptiveFollowUp: true,
        parentQuestionId: 'q-swd-01',
        topicTags: ['#AdaptiveFollowUp', '#SagaPattern', '#Consistency'],
        expectedKeywords: 'Saga pattern, eventual consistency, compensation transaction, outbox',
        maxScore: 2.0,
      ),
      const VivaQuestionModel(
        id: 'q-swd-02',
        questionNumber: 2,
        totalQuestions: 5,
        bloomLevel: 'Vận dụng (Apply)',
        content: 'Trong hệ thống Microservices, hãy nêu vai trò của API Gateway và cách bạn triển khai Rate Limiting cũng như Circuit Breaker tại tầng này?',
        topicTags: ['#ApiGateway', '#Resilience', '#CircuitBreaker'],
        expectedKeywords: 'single entry point, reverse proxy, resilience4j, token bucket, fail-open',
        maxScore: 2.0,
      ),
      const VivaQuestionModel(
        id: 'q-swd-03',
        questionNumber: 3,
        totalQuestions: 5,
        bloomLevel: 'Phân tích (Analyze)',
        content: 'Khi một service phía sau API Gateway gặp sự cố quá tải, cơ chế Circuit Breaker chuyển đổi giữa các trạng thái Closed, Open, Half-Open như thế nào để bảo vệ hệ thống?',
        isAdaptiveFollowUp: true,
        parentQuestionId: 'q-swd-02',
        topicTags: ['#HỏiXoáy', '#FaultTolerance'],
        expectedKeywords: 'failure rate threshold, sleep window, half-open trial, fallback',
        maxScore: 2.0,
      ),
      const VivaQuestionModel(
        id: 'q-swd-04',
        questionNumber: 4,
        totalQuestions: 5,
        bloomLevel: 'Vận dụng (Apply)',
        content: 'Hãy trình bày giải pháp quản lý phiên đăng nhập và bảo mật phân quyền (RBAC) với JWT khi sinh viên thay đổi mật khẩu hoặc đăng xuất toàn bộ thiết bị?',
        topicTags: ['#Security', '#JWT', '#Revocation'],
        expectedKeywords: 'refresh token, redis blacklist, token version, invalidation',
        maxScore: 2.0,
      ),
    ];
  }
}

class VivaTranscriptEntry {
  final VivaRole speaker;
  final String speakerName;
  final String text;
  final DateTime timestamp;
  final double confidence; // 0.0 to 1.0 (e.g. 96.8%)
  final bool isPartial;

  const VivaTranscriptEntry({
    required this.speaker,
    required this.speakerName,
    required this.text,
    required this.timestamp,
    this.confidence = 0.968,
    this.isPartial = false,
  });

  VivaTranscriptEntry copyWith({
    VivaRole? speaker,
    String? speakerName,
    String? text,
    DateTime? timestamp,
    double? confidence,
    bool? isPartial,
  }) {
    return VivaTranscriptEntry(
      speaker: speaker ?? this.speaker,
      speakerName: speakerName ?? this.speakerName,
      text: text ?? this.text,
      timestamp: timestamp ?? this.timestamp,
      confidence: confidence ?? this.confidence,
      isPartial: isPartial ?? this.isPartial,
    );
  }
}
