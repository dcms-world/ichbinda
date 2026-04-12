import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppMode { person, watcher }

class SecureStorage {
  static const _keyApiKey = 'api_key';
  static const _keyDeviceId = 'device_id';
  static const _keyPersonId = 'person_id';
  static const _keyWatcherId = 'watcher_id';
  static const _prefKeyMode = 'app_mode';

  final FlutterSecureStorage _secure = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  // API-Key (sicher verschlüsselt)
  Future<String?> getApiKey() => _secure.read(key: _keyApiKey);
  Future<void> setApiKey(String key) => _secure.write(key: _keyApiKey, value: key);

  // Device-ID
  Future<String?> getDeviceId() => _secure.read(key: _keyDeviceId);
  Future<void> setDeviceId(String id) => _secure.write(key: _keyDeviceId, value: id);

  // Person-ID
  Future<String?> getPersonId() => _secure.read(key: _keyPersonId);
  Future<void> setPersonId(String id) => _secure.write(key: _keyPersonId, value: id);

  // Watcher-ID
  Future<String?> getWatcherId() => _secure.read(key: _keyWatcherId);
  Future<void> setWatcherId(String id) => _secure.write(key: _keyWatcherId, value: id);

  // App-Modus (person/watcher) — nicht sicherheitskritisch, SharedPreferences reicht
  Future<AppMode?> getMode() async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.getString(_prefKeyMode);
    if (value == 'person') return AppMode.person;
    if (value == 'watcher') return AppMode.watcher;
    return null;
  }

  Future<void> setMode(AppMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKeyMode, mode.name);
  }

  // Alles löschen (Reset)
  Future<void> clearAll() async {
    await _secure.deleteAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
