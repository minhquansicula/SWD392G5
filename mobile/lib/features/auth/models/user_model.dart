class UserModel {
  final String id;
  final String username;
  final String fullName;
  final String userCode; // e.g. SE170245
  final String role; // STUDENT
  final String department;
  final String semester;
  final String avatarUrl;
  final String? token;

  const UserModel({
    required this.id,
    required this.username,
    required this.fullName,
    required this.userCode,
    required this.role,
    this.department = 'Kỹ thuật Phần mềm (Software Engineering)',
    this.semester = 'Fall 2026',
    this.avatarUrl = '',
    this.token,
  });

  factory UserModel.mockStudent() {
    return const UserModel(
      id: 'usr-se-170245',
      username: 'hoangse170245',
      fullName: 'Nguyễn Minh Hoàng',
      userCode: 'SE170245',
      role: 'STUDENT',
      department: 'Kỹ thuật Phần mềm (FIT Dept)',
      semester: 'Fall 2026',
      token: 'jwt_mock_token_student_aives_2026',
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      fullName: json['fullName'] ?? json['full_name'] ?? '',
      userCode: json['userCode'] ?? json['user_code'] ?? '',
      role: json['role']?.toString() ?? 'STUDENT',
      department: json['department'] ?? 'Software Engineering',
      semester: json['semester'] ?? 'Fall 2026',
      token: json['token'] ?? json['access_token'],
    );
  }
}
