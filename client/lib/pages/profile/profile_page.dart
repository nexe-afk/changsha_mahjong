import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../services/game_state.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('个人中心')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: Column(children: [
              const CircleAvatar(radius: 48, backgroundColor: AppTheme.gold, child: Icon(Icons.person, size: 48, color: AppTheme.primaryGreen)),
              const SizedBox(height: 12),
              const Text('玩家昵称', style: TextStyle(fontSize: 24, color: AppTheme.gold)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(color: Colors.amber.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                child: const Text('Lv.5', style: TextStyle(color: AppTheme.gold)),
              ),
            ]),
          ),
          const SizedBox(height: 24),
          _statRow(),
          const SizedBox(height: 24),
          _menuItem(Icons.history, '战绩记录', () {}),
          _menuItem(Icons.settings, '设置', () {}),
          _menuItem(Icons.info, '关于', () {}),
          _menuItem(Icons.logout, '退出登录', () {
            appState.logout();
            Navigator.pushReplacementNamed(context, '/login');
          }),
        ],
      ),
    );
  }

  Widget _statRow() {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
      _statItem('总场次', '128'),
      _statItem('胜场', '67'),
      _statItem('胜率', '52.3%'),
      _statItem('金币', '10,000'),
    ]);
  }

  Widget _statItem(String label, String value) {
    return Column(children: [
      Text(value, style: const TextStyle(color: AppTheme.gold, fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 4),
      Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12)),
    ]);
  }

  Widget _menuItem(IconData icon, String title, VoidCallback onTap) {
    return Card(
      color: Colors.white10,
      margin: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        leading: Icon(icon, color: Colors.white70),
        title: Text(title, style: const TextStyle(color: Colors.white)),
        trailing: const Icon(Icons.chevron_right, color: Colors.white38),
        onTap: onTap,
      ),
    );
  }
}
