import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/exam/providers/exam_provider.dart';
import 'features/home/screens/main_navigation_screen.dart';
import 'features/report/providers/report_provider.dart';
import 'features/viva_session/providers/viva_session_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Set immersive dark status bar and navigation bar styling
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.black,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const AivesApp());
}

class AivesApp extends StatelessWidget {
  const AivesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ExamProvider()),
        ChangeNotifierProvider(create: (_) => VivaSessionProvider()),
        ChangeNotifierProvider(create: (_) => ReportProvider()),
      ],
      child: MaterialApp(
        title: 'AIVES Oral Exam',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const AppRootGate(),
      ),
    );
  }
}

class AppRootGate extends StatelessWidget {
  const AppRootGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.isAuthenticated) {
      return const MainNavigationScreen();
    }
    return const LoginScreen();
  }
}
