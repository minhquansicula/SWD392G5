class ApiEndpoints {
  ApiEndpoints._();

  // Spring Boot Java Backend default
  // Android emulator uses 10.0.2.2 to reach host machine's localhost:8080
  static String defaultBaseUrl = 'http://10.0.2.2:8080/api';

  // Python AI Engine / WebSocket Viva Voice Core default
  // Endpoint format: ws://<host>:8000/ws/viva/{scheduleId}
  static String defaultWebSocketUrl = 'ws://10.0.2.2:8000/ws/viva/';

  // Auth endpoints (AuthController.java)
  static const String login = '/auth/login';
  static const String currentUser = '/auth/me';

  // Exam endpoints (ExamScheduleController.java)
  static const String studentMySchedules = '/student/my-schedules';
  static const String studentScheduleStart = '/student/schedules'; // + /{id}/start
  static const String assignedQuestions = '/schedules'; // + /{id}/assigned-questions

  // Report endpoints
  static const String examReports = '/reports/student';
  static const String examReportDetail = '/reports/';
}
