import 'package:flutter/material.dart';

class TileWidget extends StatelessWidget {
  final String suit;
  final int value;
  final bool faceUp;
  final bool selected;
  final VoidCallback? onTap;
  final double width;
  final double height;
  final bool isRedTile; // 五万、五筒、五条为红

  const TileWidget({
    super.key,
    required this.suit,
    required this.value,
    this.faceUp = true,
    this.selected = false,
    this.onTap,
    this.width = 42,
    this.height = 58,
    this.isRedTile = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: width,
        height: height,
        margin: EdgeInsets.only(top: selected ? 0 : 10),
        decoration: faceUp ? _faceDecoration() : _backDecoration(),
        child: faceUp ? _buildFace() : _buildBack(),
      ),
    );
  }

  BoxDecoration _faceDecoration() {
    return BoxDecoration(
      color: AppColors.tileBg,
      borderRadius: BorderRadius.circular(5),
      border: Border.all(
        color: selected ? AppColors.selectedBorder : AppColors.tileBorder,
        width: selected ? 2.5 : 0.8,
      ),
      boxShadow: [
        BoxShadow(
          color: selected
              ? AppColors.selectedShadow
              : Colors.black45,
          blurRadius: selected ? 4 : 2,
          offset: Offset(selected ? 0 : 1, selected ? 0 : 2.5),
        ),
      ],
    );
  }

  BoxDecoration _backDecoration() {
    return BoxDecoration(
      color: AppColors.backGreen,
      borderRadius: BorderRadius.circular(5),
      border: Border.all(color: AppColors.backBorder, width: 1.5),
      boxShadow: [
        BoxShadow(
          color: Colors.black38,
          blurRadius: 2,
          offset: const Offset(1, 2.5),
        ),
      ],
    );
  }

  Widget _buildFace() {
    final color = isRedTile ? AppColors.wanRed : _suitColor();
    final numStr = _numStr();
    final suitStr = _suitSymbol();
    final fontSize = width * 0.32;
    final smallFontSize = width * 0.2;

    return Container(
      padding: EdgeInsets.symmetric(horizontal: width * 0.06),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(3),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.tileBg,
            AppColors.tileBgDark,
          ],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // 上方数字
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              numStr,
              style: TextStyle(
                fontSize: fontSize,
                color: color,
                fontWeight: FontWeight.w900,
                height: 1.0,
                shadows: [
                  Shadow(
                    color: color.withOpacity(0.3),
                    blurRadius: 0.5,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 1),
          // 中间装饰线
          Container(
            height: 1.5,
            width: width * 0.5,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  color.withOpacity(0.4),
                  Colors.transparent,
                ],
              ),
            ),
          ),
          const SizedBox(height: 1),
          // 下方花色
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              suitStr,
              style: TextStyle(
                fontSize: smallFontSize,
                color: color,
                fontWeight: FontWeight.w700,
                height: 1.1,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _numStr() {
    const nums = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return nums[value - 1];
  }

  String _suitSymbol() {
    switch (suit) {
      case 'wan': return '萬';
      case 'tiao': return '條';
      case 'tong': return '筒';
      default: return '';
    }
  }

  Color _suitColor() {
    switch (suit) {
      case 'wan': return AppColors.wanRed;
      case 'tiao': return AppColors.tiaoBlue;
      case 'tong': return AppColors.tongGreen;
      default: return Colors.black87;
    }
  }

  Widget _buildBack() {
    return Container(
      margin: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppColors.backInner,
        borderRadius: BorderRadius.circular(3),
        border: Border.all(color: AppColors.backInnerBorder, width: 0.5),
      ),
      child: Center(
        child: Icon(
          Icons.grid_on_rounded,
          color: AppColors.backInnerBorder,
          size: width * 0.45,
        ),
      ),
    );
  }
}

class AppColors {
  static const Color tileBg = Color(0xFFFDF5E6);
  static const Color tileBgDark = Color(0xFFF5ECD8);
  static const Color tileBorder = Color(0xFFC0B898);
  static const Color selectedBorder = Color(0xFFFFD700);
  static const Color selectedShadow = Color(0x44FFD700);

  static const Color backGreen = Color(0xFF1B5E20);
  static const Color backBorder = Color(0xFF2E7D32);
  static const Color backInner = Color(0xFF2E7D32);
  static const Color backInnerBorder = Color(0xFF236B28);

  static const Color wanRed = Color(0xFFB71C1C);
  static const Color tiaoBlue = Color(0xFF1565C0);
  static const Color tongGreen = Color(0xFF2E7D32);
}
