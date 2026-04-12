import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/person/person_screen.dart';
import 'features/watcher/watcher_screen.dart';
import 'shared/storage/secure_storage.dart';
import 'providers.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final storage = ref.watch(storageProvider);

  return GoRouter(
    redirect: (context, state) async {
      final mode = await storage.getMode();
      if (mode == null) return '/onboarding';
      if (state.matchedLocation == '/onboarding') {
        return mode == AppMode.person ? '/person' : '/watcher';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/person',
        builder: (context, state) => const PersonScreen(),
      ),
      GoRoute(
        path: '/watcher',
        builder: (context, state) => const WatcherScreen(),
      ),
    ],
    initialLocation: '/onboarding',
  );
});
