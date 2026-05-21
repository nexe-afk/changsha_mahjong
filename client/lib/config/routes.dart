import 'package:flutter/material.dart';
import '../pages/splash/splash_page.dart';
import '../pages/login/login_page.dart';
import '../pages/lobby/lobby_page.dart';
import '../pages/room/room_page.dart';
import '../pages/game/game_page.dart';
import '../pages/result/result_page.dart';
import '../pages/shop/shop_page.dart';
import '../pages/ranking/ranking_page.dart';
import '../pages/friends/friends_page.dart';
import '../pages/profile/profile_page.dart';
import '../pages/lan/lan_lobby_page.dart';

class AppRoutes {
  static const String splash = '/';
  static const String login = '/login';
  static const String lobby = '/lobby';
  static const String room = '/room';
  static const String game = '/game';
  static const String result = '/result';
  static const String shop = '/shop';
  static const String ranking = '/ranking';
  static const String friends = '/friends';
  static const String profile = '/profile';
  static const String lan = '/lan';

  static Map<String, WidgetBuilder> get routes => {
    splash: (_) => const SplashPage(),
    login: (_) => const LoginPage(),
    lobby: (_) => const LobbyPage(),
    room: (_) => const RoomPage(),
    game: (_) => const GamePage(),
    result: (_) => const ResultPage(),
    shop: (_) => const ShopPage(),
    ranking: (_) => const RankingPage(),
    friends: (_) => const FriendsPage(),
    profile: (_) => const ProfilePage(),
    lan: (_) => const LanLobbyPage(),
  };
}
