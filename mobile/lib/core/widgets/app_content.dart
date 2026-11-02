import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

class AppContent extends StatelessWidget {
  final Widget child;
  const AppContent({super.key, required this.child});
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, box) {
      final gutter = box.maxWidth >= 600 ? 24.0 : 16.0;
      return Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: gutter),
            child: child,
          ),
        ),
      );
    },
  );
}

class AppMessage extends StatelessWidget {
  final String message;
  final bool isError;
  final VoidCallback? onRetry;
  final String retryLabel;
  const AppMessage({
    super.key,
    required this.message,
    this.isError = false,
    this.onRetry,
    this.retryLabel = 'Thử lại',
  });
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceCardHigh,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isError ? AppColors.danger : AppColors.borderGlass,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message, style: AppTextStyles.bodyMd),
          if (onRetry != null)
            TextButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: Text(retryLabel),
            ),
        ],
      ),
    ),
  );
}
