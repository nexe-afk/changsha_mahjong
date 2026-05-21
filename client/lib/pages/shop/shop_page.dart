import 'package:flutter/material.dart';
import '../../config/theme.dart';

class ShopPage extends StatelessWidget {
  const ShopPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('商城')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('金币充值', style: TextStyle(color: AppTheme.gold, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _coinPackage(context, '6,000 金币', '¥6', 6000),
          _coinPackage(context, '30,000 金币', '¥28', 30000),
          _coinPackage(context, '100,000 金币', '¥88', 100000),
          _coinPackage(context, '500,000 金币', '¥388', 500000),
          const SizedBox(height: 24),
          const Text('道具', style: TextStyle(color: AppTheme.gold, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _itemCard(context, '头像框 - 金龙', '2,000 金币', Icons.border_color),
          _itemCard(context, '表情包 - 麻将大师', '1,500 金币', Icons.emoji_emotions),
          _itemCard(context, '牌桌皮肤 - 翡翠绿', '3,000 金币', Icons.table_bar),
        ],
      ),
    );
  }

  Widget _coinPackage(BuildContext context, String name, String price, int coins) {
    return Card(
      color: Colors.white10,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.monetization_on, color: AppTheme.gold, size: 32),
        title: Text(name, style: const TextStyle(color: Colors.white)),
        trailing: ElevatedButton(onPressed: () {}, child: Text(price)),
      ),
    );
  }

  Widget _itemCard(BuildContext context, String name, String price, IconData icon) {
    return Card(
      color: Colors.white10,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: AppTheme.gold, size: 32),
        title: Text(name, style: const TextStyle(color: Colors.white)),
        subtitle: Text(price, style: const TextStyle(color: AppTheme.gold)),
        trailing: ElevatedButton(onPressed: () {}, child: const Text('购买')),
      ),
    );
  }
}
