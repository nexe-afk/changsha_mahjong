import 'package:flutter/material.dart';
import '../../config/theme.dart';

class RankingPage extends StatefulWidget {
  const RankingPage({super.key});
  @override
  State<RankingPage> createState() => _RankingPageState();
}

class _RankingPageState extends State<RankingPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('排行榜'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [Tab(text: '日榜'), Tab(text: '周榜'), Tab(text: '月榜')],
          labelColor: AppTheme.gold,
          unselectedLabelColor: Colors.white54,
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_buildRankList(), _buildRankList(), _buildRankList()],
      ),
    );
  }

  Widget _buildRankList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 20,
      itemBuilder: (context, index) {
        final rank = index + 1;
        final medalColor = rank == 1 ? Colors.amber : rank == 2 ? Colors.grey : rank == 3 ? Colors.brown : null;
        return Card(
          color: Colors.white10,
          margin: const EdgeInsets.only(bottom: 4),
          child: ListTile(
            leading: medalColor != null
                ? CircleAvatar(backgroundColor: medalColor, child: Text('$rank', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)))
                : CircleAvatar(backgroundColor: Colors.white24, child: Text('$rank', style: const TextStyle(color: Colors.white))),
            title: Text('玩家 ${rank * 137 % 999}', style: const TextStyle(color: Colors.white)),
            trailing: Text('${10000 - rank * 200} 金币', style: const TextStyle(color: AppTheme.gold)),
          ),
        );
      },
    );
  }
}
