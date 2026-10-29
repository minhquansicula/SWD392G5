import 'package:flutter/material.dart';

/// Design tokens aligned with Frontend "Academic Modern" design system.
/// Core palette: Deep Forest Slate (#0E1D1B / #172C29) + Precision Academic Teal (#0F766E / #78CDB8).
class AppColors {
  AppColors._();

  // Primary Branding - Academic Teal & Pine (aligned with FE tokens.css)
  static const Color primary = Color(0xFF0F766E); // Academic Teal (FE --color-indigo-600 / --primary)
  static const Color primaryLight = Color(0xFF78CDB8); // Mint Teal (FE --color-indigo-300 / dark --primary)
  static const Color primaryHover = Color(0xFF0F615B); // Darker Teal (FE --primary-hover)
  static const Color primarySoft = Color(0xFF123F3A); // Deep Teal Container (FE --primary-soft)
  static const Color primaryGlow = Color(0xFFABE1D2); // Mint Highlight (FE --color-indigo-200)

  // Secondary Branding & Harmonized Accents
  static const Color secondary = Color(0xFF219780); // Jade Teal (FE --color-indigo-500)
  static const Color secondaryLight = Color(0xFF78CDB8); // Mint Accent
  static const Color tertiary = Color(0xFF45B49D); // Mid Pine Glow (FE --color-indigo-400)

  // Surfaces & Backgrounds (FE Academic Dark: canvas #0E1D1B, surface #172C29, muted #233B37)
  static const Color background = Color(0xFF0E1D1B); // Canvas dark
  static const Color surfaceDeep = Color(0xFF081614); // Telemetry / Room Deep
  static const Color surfaceCard = Color(0xFF172C29); // Card surface
  static const Color surfaceCardHigh = Color(0xFF233B37); // Raised surface / muted
  static const Color surfaceCardLow = Color(0xFF112220); // Subdued container
  static const Color surfaceGlass = Color(0xD9172C29); // 85% opacity frosted glass

  // Borders & Dividers (FE line: #35504A)
  static const Color borderGlass = Color(0xFF35504A); // Clean structural border
  static const Color borderGlow = Color(0x3378CDB8); // Subtle mint teal glow (20% opacity)
  static const Color borderLight = Color(0x2678CDB8); // Subtle accent line

  // Semantic Status Colors
  static const Color success = Color(0xFF10B981); // Emerald
  static const Color successDark = Color(0xFF059669);
  static const Color warning = Color(0xFFF59E0B); // Amber
  static const Color danger = Color(0xFFEF4444); // Rose Red
  static const Color dangerDark = Color(0xFFB91C1C);

  // Typography Colors (FE dark: ink #EDF5F2, muted #B4C8C1)
  static const Color textPrimary = Color(0xFFEDF5F2); // Primary Ink
  static const Color textSecondary = Color(0xFFB4C8C1); // Secondary Muted
  static const Color textMuted = Color(0xFF738983); // Slate 400
  static const Color textDisabled = Color(0xFF526B65); // Slate 500

  // Gradients - Refined Academic Teal to Pine
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0F766E), Color(0xFF134E48)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient examWaveGradient = LinearGradient(
    colors: [Color(0xFF0F766E), Color(0xFF219780), Color(0xFF78CDB8)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient cardGlowGradient = LinearGradient(
    colors: [Color(0x2678CDB8), Color(0x050F766E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
