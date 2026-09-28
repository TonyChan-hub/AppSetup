import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:flutter_template_app/l10n/app_localizations.dart';

import '../core/logging/local_logger.dart';
import '../core/logging/log_entry.dart';
import '../core/theme/app_theme.dart';
import '../providers/template_provider.dart';
import '../services/device_identity/device_identity_service.dart';
import '../widgets/common/template_card.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final provider = context.read<TemplateProvider>();
      await provider.hydrate();
      await provider.loadItems();
      await LocalLogger.instance.info(
        LogCategory.template,
        'home_loaded',
        {
          'deviceId': DeviceIdentityService.clientId,
          'itemCount': provider.items.length,
        },
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.watch<TemplateProvider>();

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(24.w),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.homeTitle,
                style: context.appText.headlineSmall?.sp,
              ),
              SizedBox(height: 8.h),
              Text(
                l10n.homeSubtitle,
                style: context.appText.bodyMedium?.sp,
              ),
              SizedBox(height: 16.h),
              Text(
                l10n.counterLabel(provider.count),
                style: context.appText.bodyLarge?.sp,
              ),
              SizedBox(height: 10.h),
              ElevatedButton(
                onPressed: provider.increment,
                child: Text(l10n.increment),
              ),
              SizedBox(height: 12.h),
              OutlinedButton(
                onPressed: () => context.push('/logs'),
                child: Text(l10n.openLogs),
              ),
              SizedBox(height: 16.h),
              if (provider.loading)
                const Center(child: CircularProgressIndicator())
              else
                ...provider.items.map(
                  (item) => Padding(
                    padding: EdgeInsets.only(bottom: 12.h),
                    child: TemplateCard(
                      title: item.title,
                      description: item.description,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
