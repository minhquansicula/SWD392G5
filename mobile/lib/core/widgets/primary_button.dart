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

  const PrimaryButton({
    super.key,
    required this.text,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.gradient,
    this.backgroundColor,
    this.height = 50,
    this.borderRadius = 14,
    this.isOutlined = false,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    if (isOutlined) {
      return SizedBox(
        height: height,
        child: OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.borderGlow, width: 1.5),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(borderRadius),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 20),
          ),
          child: _buildChild(context),
        ),
      );
    }

    final effGradient = gradient ?? AppColors.primaryGradient;

    return Container(
      height: height,
      decoration: BoxDecoration(
        gradient: onPressed == null ? null : effGradient,
        color: onPressed == null ? AppColors.surfaceCardHigh : null,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: onPressed == null
            ? null
            : [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.35),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isLoading ? null : onPressed,
          borderRadius: BorderRadius.circular(borderRadius),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Center(
              child: _buildChild(context),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChild(BuildContext context) {
    if (isLoading) {
      return const SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
        ),
      );
    }

    final effectiveTextColor = textColor ?? Colors.white;

    if (icon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 20, color: effectiveTextColor),
          const SizedBox(width: 8),
          Text(
            text,
            style: AppTextStyles.labelBold.copyWith(
              color: effectiveTextColor,
              fontSize: 14,
            ),
          ),
        ],
      );
    }

    return Text(
      text,
      style: AppTextStyles.labelBold.copyWith(
        color: effectiveTextColor,
        fontSize: 14,
      ),
    );
  }
}
