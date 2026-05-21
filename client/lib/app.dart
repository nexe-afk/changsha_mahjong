import 'package:flutter/material.dart';
import 'config/theme.dart';
import 'config/routes.dart';

class ChangshaMahjongApp extends StatelessWidget {
  const ChangshaMahjongApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '长沙麻将',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      initialRoute: AppRoutes.splash,
      routes: AppRoutes.routes,
    );
  }
}
