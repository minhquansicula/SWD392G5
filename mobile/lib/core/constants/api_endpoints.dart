class ApiEndpoints {
  ApiEndpoints._();

  // ===========================================================================
  // CẤU HÌNH KẾT NỐI SERVER (Chỉnh sửa trực tiếp tại đây)
  // ===========================================================================
  //
  // Lựa chọn 1: Điện thoại thật kết nối Wi-Fi cùng mạng với PC
  static const String _host = '192.168.2.13';
  //
  // Lựa chọn 2: Localhost (Web / PC, hoặc Điện thoại cắm cáp đã chạy: adb reverse tcp:8080 tcp:8080)
  // static const String _host = 'localhost';
  //
  // Lựa chọn 3: Máy ảo Android Emulator (Android Studio)
  // static const String _host = '10.0.2.2';

  // Spring Boot Java Backend URL
  static const String defaultBaseUrl = 'http://$_host:8080/api';

  // Python AI Engine / WebSocket Viva Voice Core (demo/viva-ai-v2)
  static const String defaultWebSocketUrl = 'ws://$_host:8000/ws/live/sessions/';
  static const String aiServiceBaseUrl = 'http://$_host:8000';
  static const String aiSessionFinish = '/api/v1/sessions'; // + /{id}/finish

  // (Khi nào muốn dùng Cloud Render Production thì mở 3 dòng dưới này):
  // static const String defaultBaseUrl = 'https://aives-backend-qbox.onrender.com/api';
  // static const String defaultWebSocketUrl = 'wss://aives-backend-qbox.onrender.com/ws/live/sessions/';
  // static const String aiServiceBaseUrl = 'https://aives-backend-qbox.onrender.com';

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
