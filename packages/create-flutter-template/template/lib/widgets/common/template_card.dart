import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class TemplateCard extends StatelessWidget {
  const TemplateCard({
    super.key,
    required this.title,
    required this.description,
  });

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: context.appText.titleMedium),
          const SizedBox(height: 6),
          Text(description, style: context.appText.bodyMedium),
        ],
      ),
    );
  }
}
