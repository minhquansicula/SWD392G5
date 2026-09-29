import 'package:flutter/material.dart';

/// Design tokens extracted directly from Stitch MCP Project "AIVES Oral Exam Mobile App"
class AppColors {
  AppColors._();

  // Primary Branding
  static const Color primary = Color(0xFF4F46E5); // Deep Indigo
  static const Color primaryLight = Color(0xFF6366F1);
  static const Color primaryGlow = Color(0xFFC3C0FF);
  
  // Secondary Branding & AI Visualizer
  static const Color secondary = Color(0xFF7C3AED); // Electric Purple
  static const Color secondaryLight = Color(0xFF8B5CF6);
  static const Color tertiary = Color(0xFF06B6D4); // Cyan AI Glow
  
  // Surfaces & Backgrounds
  static const Color background = Color(0xFF0B1326); // Deep Academic Dark
  static const Color surfaceDeep = Color(0xFF0A0F1D); // Exam Room Dark
  static const Color surfaceCard = Color(0xFF1E293B); // Slate 800
  static const Color surfaceCardHigh = Color(0xFF222A3D);
  static const Color surfaceCardLow = Color(0xFF131B2E);
  static const Color surfaceGlass = Color(0xB81E293B); // 72% opacity frosted glass

  // Borders & Dividers
  static const Color borderGlass = Color(0x1AFFFFFF); // rgba(255, 255, 255, 0.1)
  static const Color borderGlow = Color(0x597C3AED); // subtle purple glow
  static const Color borderLight = Color(0x334F46E5);

  // Semantic Status Colors
  static const Color success = Color(0xFF10B981); // Emerald Green
  static const Color successDark = Color(0xFF059669);
  static const Color warning = Color(0xFFF59E0B); // Amber
  static const Color danger = Color(0xFFEF4444); // Rose Red
  static const Color dangerDark = Color(0xFFE11D48);

  // Typography Colors
  static const Color textPrimary = Color(0xFFF8FAFC); // Slate 50
  static const Color textSecondary = Color(0xFFCBD5E1); // Slate 300
  static const Color textMuted = Color(0xFF94A3B8); // Slate 400
  static const Color textDisabled = Color(0xFF64748B); // Slate 500

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient examWaveGradient = LinearGradient(
    colors: [Color(0xFF4F46E5), Color(0xFF7C3AED), Color(0xFF06B6D4)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient cardGlowGradient = LinearGradient(
    colors: [Color(0x337C3AED), Color(0x054F46E5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
