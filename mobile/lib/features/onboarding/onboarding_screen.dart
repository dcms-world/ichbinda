import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/storage/secure_storage.dart';
import '../../providers.dart';

class OnboardingScreen extends ConsumerWidget {
  const OnboardingScreen({super.key});

  Future<void> _selectMode(
    BuildContext context,
    WidgetRef ref,
    AppMode mode,
  ) async {
    final storage = ref.read(storageProvider);
    await storage.setMode(mode);
    if (!context.mounted) return;
    if (mode == AppMode.person) {
      context.go('/person');
    } else {
      context.go('/watcher');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'iBinda',
                style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              const Text(
                'Wie möchtest du diese App nutzen?',
                style: TextStyle(fontSize: 18),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              _ModeCard(
                icon: Icons.favorite_outline,
                title: 'Ich bin die Person',
                subtitle: 'Ich gebe täglich ein Lebenszeichen von mir.',
                onTap: () => _selectMode(context, ref, AppMode.person),
              ),
              const SizedBox(height: 16),
              _ModeCard(
                icon: Icons.visibility_outlined,
                title: 'Ich bin der Beobachter',
                subtitle: 'Ich möchte benachrichtigt werden, wenn jemand sich nicht meldet.',
                onTap: () => _selectMode(context, ref, AppMode.watcher),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ModeCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Icon(icon, size: 36),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(subtitle, style: const TextStyle(fontSize: 13, color: Colors.black54)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
