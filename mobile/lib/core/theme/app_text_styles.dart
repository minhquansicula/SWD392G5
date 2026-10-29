import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Typography aligned with Frontend 'Be Vietnam Pro' & 'JetBrains Mono' font stacks.
class AppTextStyles {
  AppTextStyles._();

  static TextStyle headlineXl = GoogleFonts.beVietnamPro(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.6,
    color: AppColors.textPrimary,
  );

  static TextStyle headlineLg = GoogleFonts.beVietnamPro(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.4,
    color: AppColors.textPrimary,
  );

  static TextStyle headlineMd = GoogleFonts.beVietnamPro(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    color: AppColors.textPrimary,
  );

  static TextStyle titleMd = GoogleFonts.beVietnamPro(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.1,
    color: AppColors.textPrimary,
  );

  static TextStyle bodyLg = GoogleFonts.beVietnamPro(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 1.5,
    color: AppColors.textSecondary,
  );

  static TextStyle bodyMd = GoogleFonts.beVietnamPro(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.45,
    color: AppColors.textSecondary,
  );

  static TextStyle bodySm = GoogleFonts.beVietnamPro(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: AppColors.textMuted,
  );

  static TextStyle labelBold = GoogleFonts.beVietnamPro(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    color: AppColors.textPrimary,
  );

  static TextStyle labelSm = GoogleFonts.beVietnamPro(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.2,
    color: AppColors.textMuted,
  );

  static TextStyle codeOrTimer = GoogleFonts.jetBrainsMono(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.5,
    color: AppColors.warning,
  );
}
