class ApiEndpoints {
  ApiEndpoints._();

  // Spring Boot Java Backend URL (Render Production Cloud)
  static String defaultBaseUrl = 'https://aives-backend-qbox.onrender.com/api';
  static const String localBaseUrl = 'http://10.0.2.2:8080/api';

  // Python AI Engine / WebSocket Viva Voice Core (demo/viva-ai-v2)
  // Endpoint format: ws://<host>:8000/ws/live/sessions/{scheduleId}
  static String defaultWebSocketUrl = 'ws://10.0.2.2:8000/ws/live/sessions/';
  static String aiServiceBaseUrl = 'http://10.0.2.2:8000';
  static const String aiSessionFinish = '/api/v1/sessions'; // + /{id}/finish

  // Auth endpoints (AuthController.java)
  static const String login = '/auth/login';
  static const String currentUser = '/auth/me';
  static const String forgotPassword = '/auth/password/forgot';
  static const String checkPasswordLink = '/auth/password/link';
  static const String setPassword = '/auth/password/set';

  // Exam endpoints (ExamScheduleController.java)
  static const String studentMySchedules = '/student/my-schedules';
  static const String studentScheduleStart = '/student/schedules'; // + /{id}/start
  static const String assignedQuestions = '/schedules'; // + /{id}/assigned-questions

  // Report endpoints
  static const String examReports = '/reports/student';
  static const String examReportDetail = '/reports/';
}
