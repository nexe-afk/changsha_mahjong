import 'dart:convert';
import 'package:http/http.dart' as http;
import 'game_state.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class ApiService {
  final String baseUrl;
  String? token;

  ApiService({required this.baseUrl});

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> get(String path) async {
    final response = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: {
        if (token != null) 'Authorization': 'Bearer $token',
      },
    );
    return _handleResponse(response);
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    if (response.statusCode >= 500) {
      throw ApiException('服务器错误，请稍后重试', response.statusCode);
    }

    if (response.body.isEmpty) {
      throw ApiException('服务器返回空响应', response.statusCode);
    }

    try {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 400) {
        throw ApiException(data['message'] as String? ?? '请求失败', response.statusCode);
      }
      return data;
    } on FormatException {
      throw ApiException('响应格式错误', response.statusCode);
    }
  }

  int _parseInt(dynamic value) {
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  void _saveUser(Map<String, dynamic> data) {
    final user = data['user'] as Map<String, dynamic>;
    appState.setUser(
      token: data['token'] as String,
      userId: _parseInt(user['id']),
      nickname: user['nickname'] as String,
      coins: user['coins'].toString(),
    );
  }

  Future<bool> register(String username, String password, String nickname) async {
    try {
      final result = await post('/api/auth/register', {
        'username': username,
        'password': password,
        'nickname': nickname,
      });
      if (result['success'] == true) {
        _saveUser(result['data'] as Map<String, dynamic>);
        return true;
      }
      return false;
    } on ApiException {
      rethrow;
    }
  }

  Future<bool> login(String username, String password) async {
    try {
      final result = await post('/api/auth/login', {
        'username': username,
        'password': password,
      });
      if (result['success'] == true) {
        _saveUser(result['data'] as Map<String, dynamic>);
        return true;
      }
      return false;
    } on ApiException {
      rethrow;
    }
  }

  Future<bool> guestLogin() async {
    try {
      final result = await post('/api/auth/guest', {});
      if (result['success'] == true) {
        _saveUser(result['data'] as Map<String, dynamic>);
        return true;
      }
      return false;
    } on ApiException {
      rethrow;
    }
  }
}
