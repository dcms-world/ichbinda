import 'dart:convert';
import 'package:http/http.dart' as http;
import '../shared/storage/secure_storage.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  static const String _baseUrl = 'https://api.ibinda.app';

  final SecureStorage _storage;

  ApiClient(this._storage);

  Future<Map<String, String>> _authHeaders() async {
    final apiKey = await _storage.getApiKey();
    if (apiKey == null) return {};
    return {'Authorization': 'Bearer $apiKey'};
  }

  Future<Map<String, dynamic>> _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return Future.value({});
      return Future.value(jsonDecode(response.body) as Map<String, dynamic>);
    }
    String message = 'Unbekannter Fehler';
    try {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      message = body['error'] as String? ?? message;
    } catch (_) {}
    throw ApiException(response.statusCode, message);
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = true,
  }) async {
    final headers = {
      'Content-Type': 'application/json',
      if (auth) ...await _authHeaders(),
    };
    final response = await http.post(
      Uri.parse('$_baseUrl$path'),
      headers: headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> get(String path) async {
    final headers = {
      'Content-Type': 'application/json',
      ...await _authHeaders(),
    };
    final response = await http.get(
      Uri.parse('$_baseUrl$path'),
      headers: headers,
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> put(
    String path,
    Map<String, dynamic> body,
  ) async {
    final headers = {
      'Content-Type': 'application/json',
      ...await _authHeaders(),
    };
    final response = await http.put(
      Uri.parse('$_baseUrl$path'),
      headers: headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> delete(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final headers = {
      'Content-Type': 'application/json',
      ...await _authHeaders(),
    };
    final request = http.Request('DELETE', Uri.parse('$_baseUrl$path'));
    request.headers.addAll(headers);
    if (body != null) request.body = jsonEncode(body);
    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    return _handleResponse(response);
  }
}
