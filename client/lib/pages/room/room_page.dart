import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/game_state.dart';

class RoomPage extends StatefulWidget {
  const RoomPage({super.key});
  @override
  State<RoomPage> createState() => _RoomPageState();
}

class _RoomPageState extends State<RoomPage> {
  String _roomId = '';
  List<Map<String, dynamic>> _players = [];
  int _playerCount = 1;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null) {
        setState(() => _roomId = args['roomId'] as String? ?? '');
      }
    });

    final socket = appState.socket;
    if (socket != null) {
      socket.on('room:state', _onRoomState);
      socket.on('game:start', _onGameStart);
    }
  }

  @override
  void dispose() {
    final socket = appState.socket;
    if (socket != null) {
      socket.off('room:state');
      socket.off('game:start');
    }
    super.dispose();
  }

  void _onRoomState(dynamic data) {
    if (!mounted) return;
    final state = data as Map<String, dynamic>;
    final players = (state['players'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [];
    setState(() {
      _roomId = state['roomId'] as String? ?? _roomId;
      _players = players;
      _playerCount = players.length;
    });
  }

  void _onGameStart(dynamic data) {
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/game');
    }
  }

  void _startWithAI() {
    appState.socket?.emit('room:leave');
    appState.socket?.emit('room:joinAI', {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.bgGradient),
        child: SafeArea(
          child: Column(
            children: [
              // 顶部
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: const BoxDecoration(
                  gradient: AppTheme.headerGradient,
                  border: Border(bottom: BorderSide(color: AppTheme.gold, width: 0.5)),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: AppTheme.gold),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Icon(Icons.meeting_room, color: AppTheme.gold, size: 22),
                    const SizedBox(width: 8),
                    Text('房间号: $_roomId', style: GoogleFonts.notoSerifSc(
                      color: AppTheme.gold, fontSize: 18, fontWeight: FontWeight.bold,
                    )),
                    const Spacer(),
                    Text('$_playerCount/4', style: const TextStyle(color: Colors.white54, fontSize: 14)),
                  ],
                ),
              ),
              // 等待提示
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  _playerCount < 4 ? '等待更多玩家加入...' : '玩家已满，即将开始！',
                  style: GoogleFonts.notoSansSc(color: Colors.white54, fontSize: 14, letterSpacing: 1),
                ),
              ),
              // 座位
              Expanded(child: _buildSeatLayout()),
              // 按钮区
              Container(
                padding: const EdgeInsets.fromLTRB(32, 12, 32, 24),
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: Colors.white12)),
                ),
                child: Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: _startWithAI,
                        icon: const Icon(Icons.smart_toy_rounded, size: 22),
                        label: Text('直接开始（对战AI）', style: GoogleFonts.notoSansSc(
                          fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1,
                        )),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () {
                          appState.socket?.emit('room:leave');
                          Navigator.pop(context);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white54,
                          side: const BorderSide(color: Colors.white24),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: Text('离开房间', style: GoogleFonts.notoSansSc(fontSize: 16)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSeatLayout() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildSeat(0, '庄家'),
          const SizedBox(height: 32),
          Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            _buildSeat(3, '左家'),
            SizedBox(
              width: 60, height: 60,
              child: Center(child: Icon(Icons.casino, color: AppTheme.gold.withOpacity(0.3), size: 40)),
            ),
            _buildSeat(1, '右家'),
          ]),
          const SizedBox(height: 32),
          _buildSeat(2, '对家'),
        ],
      ),
    );
  }

  Widget _buildSeat(int index, String label) {
    final hasPlayer = index < _playerCount;
    final player = hasPlayer && _players.isNotEmpty ? _players[index] : null;
    final isMe = player != null && player['userId'].toString() == appState.userId.toString();
    final nickname = player?['nickname'] as String? ?? '';

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: 130, height: 130,
      decoration: BoxDecoration(
        color: hasPlayer ? Colors.white.withOpacity(0.08) : Colors.black26,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isMe ? AppTheme.gold : (hasPlayer ? Colors.white24 : Colors.white10),
          width: isMe ? 2 : 1,
        ),
      ),
      child: hasPlayer
          ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: isMe ? AppTheme.gold.withOpacity(0.2) : Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Icon(Icons.person, color: isMe ? AppTheme.gold : Colors.white54, size: 28),
              ),
              const SizedBox(height: 6),
              Text(
                isMe ? '$nickname (你)' : nickname,
                style: GoogleFonts.notoSansSc(color: isMe ? AppTheme.gold : Colors.white, fontSize: 13),
              ),
            ])
          : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: Colors.white10),
                ),
                child: const Icon(Icons.person_add_alt_1, color: Colors.white24, size: 24),
              ),
              const SizedBox(height: 6),
              Text('等待加入...', style: GoogleFonts.notoSansSc(color: Colors.white24, fontSize: 12)),
            ]),
    );
  }
}
