import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

enum OrbState {
  idle,
  aiSpeaking,
  listening,
  processing,
}

class AudioPulseOrb extends StatefulWidget {
  final OrbState state;
  final double audioLevel; // 0.0 to 1.0
  final double size;

  const AudioPulseOrb({
    super.key,
    this.state = OrbState.idle,
    this.audioLevel = 0.0,
    this.size = 180,
  });

  @override
  State<AudioPulseOrb> createState() => _AudioPulseOrbState();
}

class _AudioPulseOrbState extends State<AudioPulseOrb>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return CustomPaint(
          size: Size(widget.size, widget.size),
          painter: _OrbPainter(
            animationValue: _controller.value,
            state: widget.state,
            audioLevel: widget.audioLevel,
          ),
          child: SizedBox(
            width: widget.size,
            height: widget.size,
            child: Center(
              child: _buildInnerIcon(),
            ),
          ),
        );
      },
    );
  }

  Widget _buildInnerIcon() {
    switch (widget.state) {
      case OrbState.aiSpeaking:
        return const Icon(
          Icons.graphic_eq_rounded,
          color: Colors.white,
          size: 42,
        );
      case OrbState.listening:
        return const Icon(
          Icons.mic_rounded,
          color: Colors.white,
          size: 42,
        );
      case OrbState.processing:
        return const Icon(
          Icons.auto_awesome_rounded,
          color: Colors.white,
          size: 40,
        );
      case OrbState.idle:
        return const Icon(
          Icons.smart_toy_rounded,
          color: Colors.white70,
          size: 38,
        );
    }
  }
}

class _OrbPainter extends CustomPainter {
  final double animationValue;
  final OrbState state;
  final double audioLevel;

  _OrbPainter({
    required this.animationValue,
    required this.state,
    required this.audioLevel,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final baseRadius = size.width * 0.28;

    // Outer ripple waves when listening or speaking
    if (state == OrbState.listening || state == OrbState.aiSpeaking) {
      for (int i = 0; i < 3; i++) {
        final progress = (animationValue + i / 3.0) % 1.0;
        final waveRadius = baseRadius + progress * (size.width * 0.22);
        final opacity = (1.0 - progress) * (0.35 + audioLevel * 0.4);

        final wavePaint = Paint()
          ..color = (state == OrbState.listening ? AppColors.tertiary : AppColors.secondary)
              .withValues(alpha: opacity.clamp(0.0, 1.0))
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0;

        canvas.drawCircle(center, waveRadius, wavePaint);
      }
    }

    // Glowing Ambient Aura
    final auraRadius = baseRadius + (audioLevel * 14.0);
    final auraPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          state == OrbState.listening
              ? AppColors.tertiary.withValues(alpha: 0.6)
              : AppColors.secondary.withValues(alpha: 0.6),
          AppColors.primary.withValues(alpha: 0.2),
          Colors.transparent,
        ],
        stops: const [0.2, 0.7, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: auraRadius * 1.5));

    canvas.drawCircle(center, auraRadius * 1.4, auraPaint);

    // Dynamic Waveform ring when listening
    if (state == OrbState.listening || state == OrbState.aiSpeaking) {
      final barCount = 36;
      final ringPaint = Paint()
        ..color = state == OrbState.listening ? AppColors.tertiary : AppColors.secondaryLight
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 3.0;

      for (int i = 0; i < barCount; i++) {
        final angle = (i * 2 * math.pi / barCount) + (animationValue * math.pi);
        final heightMod = math.sin((i * 4) + (animationValue * 10)) * 0.5 + 0.5;
        final barHeight = 4 + (heightMod * audioLevel * 20);

        final startX = center.dx + (baseRadius + 4) * math.cos(angle);
        final startY = center.dy + (baseRadius + 4) * math.sin(angle);
        final endX = center.dx + (baseRadius + 4 + barHeight) * math.cos(angle);
        final endY = center.dy + (baseRadius + 4 + barHeight) * math.sin(angle);

        canvas.drawLine(Offset(startX, startY), Offset(endX, endY), ringPaint);
      }
    }

    // Core Orb sphere with gradient
    final orbPaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.3, -0.3),
        colors: state == OrbState.listening
            ? [const Color(0xFF22D3EE), AppColors.tertiary, AppColors.primary]
            : [AppColors.secondaryLight, AppColors.secondary, AppColors.primary],
      ).createShader(Rect.fromCircle(center: center, radius: baseRadius));

    canvas.drawCircle(center, baseRadius, orbPaint);
  }

  @override
  bool shouldRepaint(covariant _OrbPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
        oldDelegate.state != state ||
        oldDelegate.audioLevel != audioLevel;
  }
}
