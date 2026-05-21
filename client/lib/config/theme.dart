import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // 主色调 - 中式麻将风格
  static const Color primaryGreen = Color(0xFF1A3C34);
  static const Color tableGreen = Color(0xFF0D5E3A);
  static const Color darkGreen = Color(0xFF0A2E2A);
  static const Color gold = Color(0xFFD4A944);
  static const Color lightGold = Color(0xFFE8C86A);
  static const Color accent = Color(0xFFC62828);
  static const Color deepRed = Color(0xFF8B0000);
  static const Color ivory = Color(0xFFFFF8E1);
  static const Color warmBeige = Color(0xFFF5E6C8);
  static const Color lightBg = Color(0xFFFDF8EF);
  static const Color tileFace = Color(0xFFFDF5E6);
  static const Color tileBorder = Color(0xFFC0B898);

  // 麻将牌花色颜色
  static const Color wanRed = Color(0xFFB71C1C);
  static const Color tiaoBlue = Color(0xFF1565C0);
  static const Color tongGreen = Color(0xFF2E7D32);

  // 渐变背景
  static const LinearGradient bgGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF1A3C34), Color(0xFF0D2B24), Color(0xFF071A16)],
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFD4A944), Color(0xFFE8C86A), Color(0xFFD4A944)],
  );

  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFF1A3C34), Color(0xFF0D5E3A)],
  );

  static ThemeData get theme => ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: primaryGreen,
    brightness: Brightness.dark,
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: GoogleFonts.notoSerifSc(
        color: gold,
        fontSize: 20,
        fontWeight: FontWeight.bold,
        letterSpacing: 2,
      ),
      iconTheme: const IconThemeData(color: gold),
    ),
    textTheme: TextTheme(
      headlineLarge: GoogleFonts.notoSerifSc(
        color: gold,
        fontSize: 28,
        fontWeight: FontWeight.bold,
        letterSpacing: 2,
      ),
      headlineMedium: GoogleFonts.notoSansSc(
        color: Colors.white,
        fontSize: 20,
        fontWeight: FontWeight.w500,
      ),
      titleLarge: GoogleFonts.notoSerifSc(
        color: gold,
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: GoogleFonts.notoSansSc(color: Colors.white, fontSize: 16),
      bodyMedium: GoogleFonts.notoSansSc(color: Colors.white70, fontSize: 14),
      labelLarge: GoogleFonts.notoSansSc(
        color: Colors.white,
        fontSize: 16,
        fontWeight: FontWeight.w500,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: gold,
        foregroundColor: primaryGreen,
        disabledBackgroundColor: gold.withOpacity(0.5),
        disabledForegroundColor: primaryGreen.withOpacity(0.5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
        elevation: 4,
        shadowColor: gold.withOpacity(0.3),
        textStyle: GoogleFonts.notoSansSc(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          letterSpacing: 1,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white.withOpacity(0.08),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.15)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.15)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: gold, width: 2),
      ),
      hintStyle: const TextStyle(color: Colors.white38),
      labelStyle: const TextStyle(color: Colors.white60),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: const Color(0xFF2C1810),
      contentTextStyle: GoogleFonts.notoSansSc(color: gold),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      behavior: SnackBarBehavior.floating,
    ),
    dialogTheme: DialogTheme(
      backgroundColor: const Color(0xFF1A3C34),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: gold, width: 1),
      ),
    ),
    cardTheme: CardThemeData(
      color: const Color(0xFF1A3C34).withOpacity(0.8),
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: gold.withOpacity(0.3)),
      ),
    ),
  );

  // 通用卡片样式
  static BoxDecoration cardDecoration({
    Color bgColor = const Color(0xFF1A3C34),
    bool hasBorder = true,
    double radius = 16,
  }) {
    return BoxDecoration(
      color: bgColor,
      borderRadius: BorderRadius.circular(radius),
      border: hasBorder ? Border.all(color: gold.withOpacity(0.3), width: 1) : null,
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.3),
          blurRadius: 8,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  // 中式装饰边框
  static BoxDecoration chineseBorder({
    double radius = 16,
    Color borderColor = gold,
    double borderWidth = 2,
  }) {
    return BoxDecoration(
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: borderColor, width: borderWidth),
    );
  }
}
