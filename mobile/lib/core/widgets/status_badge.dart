import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

enum BadgeType {
  success,
  warning,
  info,
  danger,
  purple,
}

class StatusBadge extends StatelessWidget {
  final String label;
  final BadgeType type;
  final IconData? icon;
  final bool isPill;

  const StatusBadge({
    super.key,
    required this.label,
    this.type = BadgeType.info,
    this.icon,
    this.isPill = true,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color border;
    Color text;

    switch (type) {
      case BadgeType.success:
        bg = AppColors.success.withValues(alpha: 0.15);
        border = AppColors.success.withValues(alpha: 0.35);
        text = AppColors.success;
        break;
      case BadgeType.warning:
        bg = AppColors.warning.withValues(alpha: 0.15);
        border = AppColors.warning.withValues(alpha: 0.35);
        text = AppColors.warning;
        break;
      case BadgeType.danger:
        bg = AppColors.danger.withValues(alpha: 0.15);
        border = AppColors.danger.withValues(alpha: 0.35);
        text = AppColors.danger;
        break;
      case BadgeType.purple:
        bg = AppColors.secondary.withValues(alpha: 0.15);
        border = AppColors.secondaryLight.withValues(alpha: 0.4);
        text = AppColors.secondaryLight;
        break;
      case BadgeType.info:
        bg = AppColors.primary.withValues(alpha: 0.15);
        border = AppColors.primaryLight.withValues(alpha: 0.35);
        text = AppColors.primaryLight;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(isPill ? 20 : 6),
        border: Border.all(color: border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: text),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              label,
              style: AppTextStyles.labelSm.copyWith(
                color: text,
                fontWeight: FontWeight.w600,
                fontSize: 11,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
