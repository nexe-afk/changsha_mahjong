import 'package:flutter/material.dart';
import '../../config/theme.dart';

class FriendsPage extends StatelessWidget {
  const FriendsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('好友'),
        actions: [
          IconButton(onPressed: () {
            _showAddFriendDialog(context);
          }, icon: const Icon(Icons.person_add)),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('在线好友', style: TextStyle(color: AppTheme.gold, fontSize: 16)),
          const SizedBox(height: 8),
          _friendItem(context, '麻将高手', true),
          _friendItem(context, '长沙小哥', true),
          const SizedBox(height: 16),
          const Text('离线好友', style: TextStyle(color: Colors.white54, fontSize: 16)),
          const SizedBox(height: 8),
          _friendItem(context, '摸鱼达人', false),
          _friendItem(context, '杠上开花', false),
          _friendItem(context, '清一色王', false),
        ],
      ),
    );
  }

  Widget _friendItem(BuildContext context, String name, bool online) {
    return Card(
      color: Colors.white10,
      margin: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: online ? Colors.green : Colors.grey,
          child: const Icon(Icons.person, color: Colors.white),
        ),
        title: Text(name, style: const TextStyle(color: Colors.white)),
        subtitle: Text(online ? '在线' : '离线', style: TextStyle(color: online ? Colors.green : Colors.grey)),
        trailing: online
            ? ElevatedButton(onPressed: () {}, child: const Text('邀请'))
            : null,
      ),
    );
  }

  void _showAddFriendDialog(BuildContext context) {
    final ctrl = TextEditingController();
    showDialog(context: context, builder: (ctx) => AlertDialog(
      backgroundColor: AppTheme.primaryGreen,
      title: const Text('添加好友', style: TextStyle(color: AppTheme.gold)),
      content: TextField(
        controller: ctrl,
        decoration: const InputDecoration(hintText: '输入用户名', hintStyle: TextStyle(color: Colors.white38)),
        style: const TextStyle(color: Colors.white),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx), child: const Text('添加')),
      ],
    ));
  }
}
