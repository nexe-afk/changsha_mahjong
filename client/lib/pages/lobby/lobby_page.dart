import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';
import '../../services/game_state.dart';

class LobbyPage extends StatefulWidget {
  const LobbyPage({super.key});
  @override
  State<LobbyPage> createState() => _LobbyPageState();
}

class _LobbyPageState extends State<LobbyPage> with TickerProviderStateMixin {
  bool _matching = false;
  bool _listenersRegistered = false;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnimation = CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    );

    _connectSocket();
    appState.addListener(_onAppStateChange);
  }

  void _onAppStateChange() {
    if (appState.socket != null && !_listenersRegistered) {
      _connectSocket();
    }
  }

  void _connectSocket() {
    final socket = appState.socket;
    if (socket == null || _listenersRegistered) return;
    _listenersRegistered = true;
    socket.on('room:state', _onRoomState);
    socket.on('error', _onError);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    appState.removeListener(_onAppStateChange);
    final socket = appState.socket;
    if (socket != null) {
      socket.off('room:state');
      socket.off('error');
    }
    super.dispose();
  }

  void _onRoomState(dynamic data) {
    if (!mounted) return;
    final state = data as Map<String, dynamic>;
    final roomType = state['roomType'] as String? ?? '';
    final roomId = state['roomId'] as String? ?? '';

    if (_matching) {
      setState(() => _matching = false);
    }

    if (roomType == 'ai') {
      Navigator.pushNamed(context, '/game');
    } else {
      Navigator.pushNamed(context, '/room', arguments: {'roomId': roomId});
    }
  }

  void _onError(dynamic data) {
    if (!mounted) return;
    setState(() => _matching = false);
    final d = data as Map<String, dynamic>;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('错误: ${d['message'] ?? '未知错误'}')),
    );
  }

  void _quickMatch() {
    _ensureSocket();
    setState(() => _matching = true);
    appState.socket?.emit('room:join', {});
  }

  void _createFriendRoom() {
    _ensureSocket();
    setState(() => _matching = true);
    appState.socket?.emit('room:join', {'roomType': 'friend'});
  }

  void _joinAIRoom() {
    _ensureSocket();
    setState(() => _matching = true);
    appState.socket?.emit('room:joinAI', {});
    // Remove listener before navigating so the server's room:state reply
    // (which lacks roomType:'ai') cannot race and push /room on top of /game.
    appState.socket?.off('room:state');
    Navigator.pushReplacementNamed(context, '/game');
  }

  void _ensureSocket() {
    if (appState.socket == null) {
      appState.connectSocket(socketUrl);
      _connectSocket();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF0D2B24),
              Color(0xFF1A3C34),
              Color(0xFF0D2B24),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              Expanded(child: _buildBody()),
              _buildBottomNav(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return ListenableBuilder(
      listenable: appState,
      builder: (context, _) {
        return Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1A3C34), Color(0xFF0D5E3A)],
            ),
            border: Border(
              bottom: BorderSide(color: AppTheme.gold, width: 0.5),
            ),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  // 用户头像
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: AppTheme.goldGradient,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Center(
                      child: Icon(Icons.person, color: AppTheme.primaryGreen, size: 28),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // 昵称和等级
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          appState.nickname,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.gold.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Text(
                            'Lv.1 初入雀坛',
                            style: TextStyle(color: AppTheme.gold, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // 金币
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black26,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.gold.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.monetization_on, color: AppTheme.gold, size: 18),
                        const SizedBox(width: 4),
                        Text(
                          appState.coins,
                          style: const TextStyle(
                            color: AppTheme.gold,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBody() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 24),
            // 顶部装饰文字
            Text(
              '— 选择游戏模式 —',
              style: GoogleFonts.notoSansSc(
                color: Colors.white38,
                fontSize: 14,
                letterSpacing: 3,
              ),
            ),
            const SizedBox(height: 24),
            if (_matching)
              _buildMatchingWidget()
            else
              ..._buildGameModes(),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildMatchingWidget() {
    return Column(
      children: [
        AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Container(
              width: 80 + _pulseAnimation.value * 10,
              height: 80 + _pulseAnimation.value * 10,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: AppTheme.goldGradient,
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.gold.withOpacity(0.3 + _pulseAnimation.value * 0.2),
                    blurRadius: 20 + _pulseAnimation.value * 10,
                    spreadRadius: _pulseAnimation.value * 5,
                  ),
                ],
              ),
              child: const Center(
                child: Icon(Icons.casino, size: 36, color: AppTheme.primaryGreen),
              ),
            );
          },
        ),
        const SizedBox(height: 24),
        Text(
          '匹配中...',
          style: GoogleFonts.notoSerifSc(
            color: AppTheme.gold,
            fontSize: 20,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '正在寻找对手',
          style: GoogleFonts.notoSansSc(color: Colors.white54, fontSize: 14),
        ),
      ],
    );
  }

  List<Widget> _buildGameModes() {
    return [
      _buildGameModeCard(
        icon: Icons.play_arrow_rounded,
        title: '快速匹配',
        subtitle: '随机匹配在线玩家，随时开战',
        color: AppTheme.gold,
        iconBgColor: AppTheme.gold.withOpacity(0.15),
        onTap: _quickMatch,
      ),
      const SizedBox(height: 16),
      _buildGameModeCard(
        icon: Icons.group_rounded,
        title: '好友房',
        subtitle: '邀请好友一起玩，欢乐无限',
        color: const Color(0xFF26A69A),
        iconBgColor: const Color(0xFF26A69A).withOpacity(0.15),
        onTap: _createFriendRoom,
      ),
      const SizedBox(height: 16),
      _buildGameModeCard(
        icon: Icons.smart_toy_rounded,
        title: 'AI 练习',
        subtitle: '和电脑对战，磨练牌技',
        color: const Color(0xFF7E57C2),
        iconBgColor: const Color(0xFF7E57C2).withOpacity(0.15),
        onTap: _joinAIRoom,
      ),
      const SizedBox(height: 16),
      _buildGameModeCard(
        icon: Icons.wifi_rounded,
        title: '局域网对战',
        subtitle: '同 WiFi 下与好友直连，无需联网',
        color: const Color(0xFF26A69A),
        iconBgColor: const Color(0xFF26A69A).withOpacity(0.15),
        onTap: () => Navigator.pushNamed(context, '/lan'),
      ),
    ];
  }

  Widget _buildGameModeCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required Color iconBgColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withOpacity(0.3), width: 1),
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.08),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              // 图标
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: iconBgColor,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: color, size: 30),
              ),
              const SizedBox(width: 16),
              // 文字
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              // 箭头
              Icon(Icons.chevron_right, color: color, size: 28),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: const BoxDecoration(
        color: Color(0xFF0A2E2A),
        border: Border(
          top: BorderSide(color: Colors.white12, width: 0.5),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _navItem(Icons.store_outlined, Icons.store, '商城', '/shop'),
          _navItem(Icons.emoji_events_outlined, Icons.emoji_events, '排行', '/ranking'),
          _navItem(Icons.people_outline, Icons.people, '好友', '/friends'),
          _navItem(Icons.person_outline, Icons.person, '我的', '/profile'),
        ],
      ),
    );
  }

  Widget _navItem(IconData icon, IconData activeIcon, String label, String route) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, route),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            activeIcon,
            color: AppTheme.gold.withOpacity(0.8),
            size: 24,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: AppTheme.gold.withOpacity(0.7),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
