import 'package:flutter/material.dart';
import 'socket_service.dart';

class AppState extends ChangeNotifier {
  String? token;
  int? userId;
  String nickname = '玩家';
  String coins = '10000';
  SocketService? socket;

  void setUser({
    required String token,
    required int userId,
    required String nickname,
    required String coins,
  }) {
    this.token = token;
    this.userId = userId;
    this.nickname = nickname;
    this.coins = coins;
    notifyListeners();
  }

  void connectSocket(String serverUrl) {
    if (token == null) return;
    socket = SocketService(serverUrl: serverUrl);
    socket!.connect(token!);
    notifyListeners();
  }

  void updateCoins(String newCoins) {
    coins = newCoins;
    notifyListeners();
  }

  void logout() {
    socket?.disconnect();
    socket = null;
    token = null;
    userId = null;
    nickname = '玩家';
    coins = '10000';
    notifyListeners();
  }
}

final appState = AppState();
