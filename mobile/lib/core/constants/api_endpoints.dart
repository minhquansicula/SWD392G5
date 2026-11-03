class ApiEndpoints {
  ApiEndpoints._();

  // ===========================================================================
  // CẤU HÌNH KẾT NỐI SERVER (Chỉnh sửa trực tiếp tại đây)
  // ===========================================================================
  //
  // LỰA CHỌN HIỆN TẠI: CLOUD RENDER PRODUCTION (Hoàn toàn trên Cloud)
  // Spring Boot Java Backend URL
  static const String defaultBaseUrl = 'https://aives-backend-qbox.onrender.com/api';

  // Python AI Engine / WebSocket Viva Voice Core (python-service on Render)
  static const String defaultWebSocketUrl = 'wss://python-service-7fdx.onrender.com/ws/live/sessions/';
  static const String aiServiceBaseUrl = 'https://python-service-7fdx.onrender.com';
  static const String aiSessionFinish = '/api/v1/sessions'; // + /{id}/finish

  // ---------------------------------------------------------------------------
  // (Dự phòng khi muốn test Localhost máy ảo / ADB):
  // static const String _host = 'localhost'; // hoặc '10.0.2.2' cho Android Emulator
  // static const String defaultBaseUrl = 'http://$_host:8080/api';
  // static const String defaultWebSocketUrl = 'ws://$_host:8000/ws/live/sessions/';
  // static const String aiServiceBaseUrl = 'http://$_host:8000';
  // ---------------------------------------------------------------------------

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
