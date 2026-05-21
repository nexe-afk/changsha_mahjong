import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:async';
import '../../config/routes.dart';
import '../../config/theme.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    Timer(const Duration(seconds: 3), () {
      if (mounted) {
        Navigator.of(context).pushReplacementNamed(AppRoutes.login);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: AppTheme.bgGradient,
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 麻将牌动画
              Container(
                width: 100,
                height: 130,
                decoration: BoxDecoration(
                  color: AppTheme.tileFace,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.gold, width: 2.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.gold.withOpacity(0.3),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('中', style: TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: AppTheme.deepRed)),
                    SizedBox(height: 4),
                    Text('發', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.tongGreen)),
                  ],
                ),
              )
                .animate()
                .scale(duration: 600.ms, curve: Curves.easeOutBack)
                .rotate(duration: 800.ms, begin: -0.1, end: 0),
              const SizedBox(height: 32),
              // 标题
              const Text(
                '長沙麻將',
                style: TextStyle(
                  color: AppTheme.gold,
                  fontSize: 42,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 8,
                  shadows: [Shadow(color: Colors.black54, blurRadius: 8, offset: Offset(2, 2))],
                ),
              )
                .animate()
                .fadeIn(duration: 800.ms, delay: 200.ms)
                .slideY(begin: 0.3, end: 0),
              const SizedBox(height: 12),
              Text(
                '— 正宗湖南味 —',
                style: TextStyle(
                  color: AppTheme.gold.withOpacity(0.7),
                  fontSize: 16,
                  letterSpacing: 4,
                ),
              )
                .animate()
                .fadeIn(duration: 600.ms, delay: 600.ms),
              const SizedBox(height: 48),
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.gold.withOpacity(0.6)),
                ),
              )
                .animate()
                .fadeIn(duration: 400.ms, delay: 1000.ms),
            ],
          ),
        ),
      ),
    );
  }
}
