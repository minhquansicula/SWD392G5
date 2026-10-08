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

  factory VivaQuestionModel.fromAssignedQuestion(Map<String, dynamic> json, int total) {
    return VivaQuestionModel(
      id: json['id']?.toString() ?? '',
      questionNumber: json['questionOrder'] is int ? json['questionOrder'] : 1,
      totalQuestions: total > 0 ? total : 1,
      bloomLevel: json['difficultyLevel']?.toString() ?? 'Vận dụng',
      content: json['contentSnapshot']?.toString() ?? '',
      topicTags: const [],
      expectedKeywords: '',
    );
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
