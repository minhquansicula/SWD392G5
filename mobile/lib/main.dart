import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/exam/providers/exam_provider.dart';
import 'features/home/screens/main_navigation_screen.dart';
import 'features/report/providers/report_provider.dart';
import 'features/viva_session/providers/viva_session_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  LicenseRegistry.addLicense(() async* {
    for (final font in ['BeVietnamPro', 'JetBrainsMono']) {
      yield LicenseEntryWithLineBreaks([
        font,
      ], await rootBundle.loadString('assets/fonts/$font-OFL.txt'));
    }
  });

  // Set immersive dark status bar and navigation bar styling
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppColors.surfaceDeep,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const AivesApp());
}

class AivesApp extends StatelessWidget {
  const AivesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) => MultiProvider(
          key: ValueKey('${auth.currentUser?.id}:${auth.currentUser?.token}'),
          providers: [
            ChangeNotifierProvider(create: (_) => ExamProvider()),
            ChangeNotifierProvider(create: (_) => VivaSessionProvider()),
            ChangeNotifierProvider(create: (_) => ReportProvider()),
          ],
          child: MaterialApp(
            title: 'AIVES Oral Exam',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.darkTheme,
            builder: (context, child) => ColoredBox(
              color: AppColors.background,
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 720),
                  child: child!,
                ),
              ),
            ),
            home: const AppRootGate(),
          ),
        ),
      ),
    );
  }
}

class AppRootGate extends StatelessWidget {
  const AppRootGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.isInitializing) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: const Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryLight),
          ),
        ),
      );
    }
    if (auth.isAuthenticated) {
      return const MainNavigationScreen();
    }
    return const LoginScreen();
  }
}
