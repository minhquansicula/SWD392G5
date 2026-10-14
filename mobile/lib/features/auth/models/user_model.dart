class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String userCode; // e.g. SE170245
  final String role; // STUDENT
  final String department;
  final String semester;
  final String avatarUrl;
  final String? token;

  const UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.userCode,
    required this.role,
    this.department = 'Kỹ thuật Phần mềm (Software Engineering)',
    this.semester = 'Fall 2026',
    this.avatarUrl = '',
    this.token,
  });

  factory UserModel.fromJson(Map<String, dynamic> json, {String? token}) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      fullName: json['fullName'] ?? json['full_name'] ?? 'Sinh viên FPT',
      userCode: json['studentCode']?.toString() ?? '',
      role: json['role']?.toString() ?? 'STUDENT',
      department: json['department'] ?? 'Kỹ thuật Phần mềm (FIT Dept)',
      semester: json['semester'] ?? 'Fall 2026',
      token: token ?? json['token'] ?? json['access_token'],
    );
  }
}
