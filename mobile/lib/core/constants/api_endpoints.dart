class ApiEndpoints {
  ApiEndpoints._();

  // Spring Boot Java Backend default
  static String defaultBaseUrl = 'http://10.0.2.2:8080/api/v1';

  // Python AI Engine / WebSocket Viva Voice Core default
  // Can be configured to direct Python service or Java WebSocket proxy
  static String defaultWebSocketUrl = 'ws://10.0.2.2:8000/ws/viva/stream';

  // Auth endpoints (Nhóm 7)
  static const String login = '/auth/login';
  static const String refreshToken = '/auth/refresh';
  static const String userProfile = '/users/profile';

  // Exam endpoints (Nhóm 2)
  static const String studentExams = '/exams/student';
  static const String examSchedule = '/exams/schedule';
  static const String examDetail = '/exams/';

  // Report endpoints (Nhóm 6)
  static const String examReports = '/reports/student';
  static const String examReportDetail = '/reports/';
}
