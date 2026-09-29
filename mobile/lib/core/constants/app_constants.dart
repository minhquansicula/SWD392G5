class AppConstants {
  AppConstants._();

  static const String appName = 'AIVES Oral Exam';
  static const String appVersion = '1.0.0';

  // Audio Streaming Constants for Voice STT Core
  static const int audioSampleRate = 16000; // 16kHz
  static const int audioChannels = 1; // Mono
  static const int audioBitDepth = 16; // 16-bit
  static const int audioChunkMs = 150; // 150ms per chunk (within 100-200ms requirement)

  // Bloom Taxonomy Levels
  static const String bloomRemember = 'Nhớ (Remember)';
  static const String bloomUnderstand = 'Hiểu (Understand)';
  static const String bloomApply = 'Vận dụng (Apply)';
  static const String bloomAnalyze = 'Phân tích (Analyze)';

  // Default Session limits
  static const int defaultMaxExamMinutes = 15;
  static const int maxFollowUpPerQuestion = 2;
}
