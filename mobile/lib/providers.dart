import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api/api_client.dart';
import 'shared/storage/secure_storage.dart';

final storageProvider = Provider<SecureStorage>((ref) => SecureStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(storageProvider);
  return ApiClient(storage);
});
