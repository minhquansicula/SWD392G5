import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

class PrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final LinearGradient? gradient;
  final Color? backgroundColor;
  final double height;
  final double borderRadius;
  final bool isOutlined;
  final Color? textColor;
  final EdgeInsetsGeometry? padding;

  const PrimaryButton({
    super.key,
    required this.text,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.gradient,
    this.backgroundColor,
    this.height = 48,
    this.borderRadius = 12,
    this.isOutlined = false,
    this.textColor,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final foreground =
        textColor ?? (isOutlined ? AppColors.primaryLight : Colors.white);
    final child = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (isLoading) ...[
          SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: foreground),
          ),
          const SizedBox(width: 8),
        ] else if (icon != null) ...[
          Icon(icon, size: 20),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: Text(
            isLoading ? '$text…' : text,
            textAlign: TextAlign.center,
            style: AppTextStyles.labelBold.copyWith(
              color: onPressed == null && !isLoading
                  ? AppColors.textDisabled
                  : foreground,
            ),
          ),
        ),
      ],
    );
    final style = ButtonStyle(
      minimumSize: WidgetStatePropertyAll(Size(48, height < 48 ? 48 : height)),
      padding: WidgetStatePropertyAll(
        padding ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      foregroundColor: WidgetStatePropertyAll(foreground),
      backgroundColor: WidgetStatePropertyAll(
        isOutlined
            ? Colors.transparent
            : onPressed == null
            ? AppColors.surfaceCardHigh
            : backgroundColor ?? AppColors.primary,
      ),
      shape: WidgetStatePropertyAll(
        RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
    return Semantics(
      liveRegion: isLoading,
      child: isOutlined
          ? OutlinedButton(
              style: style,
              onPressed: isLoading ? null : onPressed,
              child: child,
            )
          : ElevatedButton(
              style: style,
              onPressed: isLoading ? null : onPressed,
              child: child,
            ),
    );
  }
}
