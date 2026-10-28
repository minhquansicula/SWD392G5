import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Thanh sóng âm phản hồi động (Dynamic Voice Waveform)
/// Tạo hiệu ứng thị giác âm thanh sống động cho cả Giám khảo AI và Thí sinh
class VoiceWaveVisualizer extends StatefulWidget {
  final bool isActive;
  final double level; // 0.0 -> 1.0
  final Color? color;
  final int barCount;
  final double height;

  const VoiceWaveVisualizer({
    super.key,
    this.isActive = true,
    this.level = 0.5,
    this.color,
    this.barCount = 7,
    this.height = 36,
  });

  @override
  State<VoiceWaveVisualizer> createState() => _VoiceWaveVisualizerState();
}

class _VoiceWaveVisualizerState extends State<VoiceWaveVisualizer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeColor = widget.color ?? AppColors.tertiary;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return SizedBox(
          height: widget.height,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: List.generate(widget.barCount, (index) {
              final progress = _controller.value;
              final wavePhase = (index / widget.barCount) * 2 * math.pi;
              final sinValue = (math.sin(progress * 2 * math.pi + wavePhase) + 1) / 2;

              final scale = widget.isActive
                  ? 0.2 + (sinValue * 0.8 * (0.4 + widget.level.clamp(0.0, 1.0) * 0.6))
                  : 0.15;

              final barHeight = (widget.height * scale).clamp(4.0, widget.height);

              return Container(
                width: 3.5,
                height: barHeight,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: widget.isActive
                      ? activeColor.withValues(alpha: 0.7 + sinValue * 0.3)
                      : AppColors.textDisabled.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(4),
                  boxShadow: widget.isActive
                      ? [
                          BoxShadow(
                            color: activeColor.withValues(alpha: 0.4),
                            blurRadius: 6,
                            spreadRadius: 1,
                          ),
                        ]
                      : null,
                ),
              );
            }),
          ),
        );
      },
    );
  }
}
