import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:web_socket_channel/io.dart';
import '../../config/theme.dart';
import '../../services/game_state.dart';
import '../../services/lan_discovery.dart';
import '../../services/lan_game_server.dart';

// ── LAN 大厅（创建 / 搜索房间）────────────────────────────────────────────────

class LanLobbyPage extends StatefulWidget {
  const LanLobbyPage({super.key});

  @override
  State<LanLobbyPage> createState() => _LanLobbyPageState();
}

class _LanLobbyPageState extends State<LanLobbyPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0D2B24), Color(0xFF1A3C34), Color(0xFF0D2B24)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              _buildTabBar(),
              Expanded(
                child: TabBarView(
                  controller: _tab,
                  children: const [_CreateRoomTab(), _JoinRoomTab()],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppTheme.gold, width: 0.5)),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Icon(Icons.arrow_back_ios, color: AppTheme.gold, size: 20),
          ),
          const SizedBox(width: 12),
          Text(
            '局域网对战',
            style: GoogleFonts.notoSerifSc(
              color: AppTheme.gold,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          const Icon(Icons.wifi, color: AppTheme.gold, size: 20),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.black26,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: AppTheme.gold.withOpacity(0.3)),
      ),
      child: TabBar(
        controller: _tab,
        indicator: BoxDecoration(
          color: AppTheme.gold,
          borderRadius: BorderRadius.circular(30),
        ),
        labelColor: AppTheme.primaryGreen,
        unselectedLabelColor: AppTheme.gold,
        labelStyle: GoogleFonts.notoSansSc(fontWeight: FontWeight.bold, fontSize: 14),
        tabs: const [Tab(text: '创建房间'), Tab(text: '加入房间')],
      ),
    );
  }
}

// ── 创建房间 ──────────────────────────────────────────────────────────────────

class _CreateRoomTab extends StatefulWidget {
  const _CreateRoomTab();

  @override
  State<_CreateRoomTab> createState() => _CreateRoomTabState();
}

class _CreateRoomTabState extends State<_CreateRoomTab> {
  final _nameCtrl = TextEditingController();
  LanGameServer? _server;
  bool _hosting = false;
  List<Map<String, dynamic>> _players = [];
  int _playerCount = 1;

  @override
  void initState() {
    super.initState();
    _nameCtrl.text = '${appState.nickname}的房间';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _server?.stop();
    super.dispose();
  }

  Future<void> _createRoom() async {
    final name = _nameCtrl.text.trim().isEmpty
        ? '${appState.nickname}的房间'
        : _nameCtrl.text.trim();

    final server = LanGameServer(
      roomId: _genRoomId(),
      roomName: name,
      hostNickname: appState.nickname,
    );

    server.onRoomChanged = (players, count) {
      if (!mounted) return;
      setState(() {
        _players = players;
        _playerCount = count;
      });
    };

    try {
      await server.start();
      setState(() {
        _server = server;
        _hosting = true;
        _players = List.generate(4, (i) => {
          'seatIndex': i,
          'nickname': i == 0 ? appState.nickname : '空位',
          'isReady': i == 0,
          'isConnected': i == 0,
        });
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('创建失败: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _startGame() {
    final server = _server;
    if (server == null) return;

    // Navigate to game page FIRST (host receives events via onHostEvent).
    Navigator.pushReplacementNamed(context, '/game', arguments: {
      'mode': 'lan',
      'isHost': true,
      'server': server,
    });

    // Server.startGame() is called from game_page once it has set onHostEvent.
    // Signal it by marking mode in arguments; game_page calls server.startGame().
  }

  String _genRoomId() =>
      DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase();


  @override
  Widget build(BuildContext context) {
    if (_hosting) return _buildWaitingRoom();
    return _buildCreateForm();
  }

  Widget _buildCreateForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('房间名称',
              style: GoogleFonts.notoSansSc(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 8),
          TextField(
            controller: _nameCtrl,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.black26,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppTheme.gold.withOpacity(0.4)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppTheme.gold.withOpacity(0.4)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.gold),
              ),
              hintText: '给你的房间起个名字',
              hintStyle: const TextStyle(color: Colors.white38),
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _createRoom,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.gold,
                foregroundColor: AppTheme.primaryGreen,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: Text('创建房间',
                  style: GoogleFonts.notoSerifSc(
                      fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.black26,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.gold.withOpacity(0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Icon(Icons.info_outline, color: AppTheme.gold, size: 16),
                  const SizedBox(width: 8),
                  Text('使用说明',
                      style: GoogleFonts.notoSansSc(
                          color: AppTheme.gold, fontWeight: FontWeight.bold)),
                ]),
                const SizedBox(height: 8),
                Text(
                  '• 确保所有设备连接同一 WiFi\n'
                  '• 创建房间后将 IP 地址告知其他玩家\n'
                  '• 等待 1-3 名玩家加入后点击开始\n'
                  '• 空位将由 AI 代为出牌',
                  style: GoogleFonts.notoSansSc(
                      color: Colors.white54, fontSize: 12, height: 1.8),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaitingRoom() {
    return Column(
      children: [
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.black26,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.gold.withOpacity(0.4)),
          ),
          child: Column(
            children: [
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.meeting_room, color: AppTheme.gold, size: 18),
                const SizedBox(width: 8),
                Text(_server?.roomName ?? '',
                    style: GoogleFonts.notoSerifSc(
                        color: AppTheme.gold,
                        fontSize: 16,
                        fontWeight: FontWeight.bold)),
              ]),
              const SizedBox(height: 8),
              FutureBuilder<String>(
                future: _getLocalIp(),
                builder: (context, snap) => Text(
                  '其他设备连接地址: ${snap.data ?? "获取中..."} : ${_server?.port ?? 0}',
                  style: GoogleFonts.notoSansSc(
                      color: Colors.white54, fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('玩家列表 ($_playerCount/4)',
                style: GoogleFonts.notoSansSc(color: Colors.white70, fontSize: 13)),
            Text('等待中...', style: GoogleFonts.notoSansSc(color: Colors.white38, fontSize: 12)),
          ]),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: 4,
            itemBuilder: (_, i) {
              final p = i < _players.length ? _players[i] : null;
              final connected = p?['isConnected'] as bool? ?? false;
              final nickname = p?['nickname'] as String? ?? '空位';
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: connected
                      ? AppTheme.gold.withOpacity(0.1)
                      : Colors.black12,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: connected
                        ? AppTheme.gold.withOpacity(0.4)
                        : Colors.white12,
                  ),
                ),
                child: Row(children: [
                  Icon(
                    connected ? Icons.person : Icons.person_outline,
                    color: connected ? AppTheme.gold : Colors.white24,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      i == 0 ? '${appState.nickname} (房主)' : nickname,
                      style: TextStyle(
                          color: connected ? Colors.white : Colors.white38,
                          fontSize: 15),
                    ),
                  ),
                  if (i == 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.gold,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('庄',
                          style: TextStyle(
                              color: Colors.black,
                              fontSize: 12,
                              fontWeight: FontWeight.bold)),
                    ),
                ]),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () {
                  _server?.stop();
                  setState(() {
                    _hosting = false;
                    _server = null;
                  });
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white54,
                  side: const BorderSide(color: Colors.white24),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('解散房间'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: _startGame,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.gold,
                  foregroundColor: AppTheme.primaryGreen,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                child: Text(
                  _playerCount >= 4 ? '开始游戏' : '开始游戏 (AI补位)',
                  style: GoogleFonts.notoSerifSc(
                      fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),
          ]),
        ),
      ],
    );
  }

  Future<String> _getLocalIp() async {
    try {
      final ifaces = await NetworkInterface.list(type: InternetAddressType.IPv4);
      for (final iface in ifaces) {
        for (final addr in iface.addresses) {
          if (!addr.isLoopback) return addr.address;
        }
      }
    } catch (_) {}
    return '127.0.0.1';
  }
}

// ── 加入房间 ──────────────────────────────────────────────────────────────────

class _JoinRoomTab extends StatefulWidget {
  const _JoinRoomTab();

  @override
  State<_JoinRoomTab> createState() => _JoinRoomTabState();
}

class _JoinRoomTabState extends State<_JoinRoomTab> {
  final LanDiscovery _discovery = LanDiscovery();
  List<LanRoom> _rooms = [];
  StreamSubscription<List<LanRoom>>? _sub;
  bool _connecting = false;

  // Manual IP entry
  final _ipCtrl = TextEditingController();
  final _portCtrl = TextEditingController(text: '9876');

  @override
  void initState() {
    super.initState();
    _startDiscovery();
  }

  Future<void> _startDiscovery() async {
    try {
      await _discovery.startListening();
      _sub = _discovery.roomsStream.listen((rooms) {
        if (mounted) setState(() => _rooms = rooms);
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _sub?.cancel();
    _discovery.stop();
    _ipCtrl.dispose();
    _portCtrl.dispose();
    super.dispose();
  }

  Future<void> _joinRoom(String ip, int port) async {
    if (_connecting) return;
    setState(() => _connecting = true);

    try {
      final uri = Uri.parse('ws://$ip:$port');
      final channel = IOWebSocketChannel.connect(uri);

      // Send join with nickname.
      channel.sink.add(jsonEncode({
        'action': 'join',
        'data': {'nickname': appState.nickname},
      }));

      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/game', arguments: {
        'mode': 'lan',
        'isHost': false,
        'channel': channel,
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('连接失败: $e'), backgroundColor: Colors.red),
        );
        setState(() => _connecting = false);
      }
    }
  }

  void _joinManual() {
    final ip = _ipCtrl.text.trim();
    final port = int.tryParse(_portCtrl.text.trim()) ?? 9876;
    if (ip.isEmpty) return;
    _joinRoom(ip, port);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Auto-discovered rooms
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: Row(children: [
            const Icon(Icons.radar, color: AppTheme.gold, size: 16),
            const SizedBox(width: 6),
            Text('自动发现的房间',
                style: GoogleFonts.notoSansSc(
                    color: AppTheme.gold, fontWeight: FontWeight.bold)),
            const Spacer(),
            if (_rooms.isEmpty)
              const SizedBox(
                width: 14, height: 14,
                child: CircularProgressIndicator(
                    color: AppTheme.gold, strokeWidth: 2),
              ),
          ]),
        ),
        if (_rooms.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
            child: Text(
              '正在搜索局域网房间...\n确保房主已创建房间且在同一 WiFi',
              style: GoogleFonts.notoSansSc(
                  color: Colors.white38, fontSize: 12, height: 1.6),
              textAlign: TextAlign.center,
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _rooms.length,
            itemBuilder: (_, i) => _buildRoomCard(_rooms[i]),
          ),

        const Divider(color: Colors.white12, height: 32),

        // Manual IP entry
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const Icon(Icons.edit, color: Colors.white38, size: 16),
                const SizedBox(width: 6),
                Text('手动输入 IP',
                    style: GoogleFonts.notoSansSc(
                        color: Colors.white54, fontSize: 13)),
              ]),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                  flex: 3,
                  child: _textField(_ipCtrl, '192.168.x.x'),
                ),
                const SizedBox(width: 8),
                Expanded(child: _textField(_portCtrl, '9876')),
              ]),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _connecting ? null : _joinManual,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF26A69A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _connecting
                      ? const SizedBox(
                          width: 20, height: 20,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                      : Text('连接',
                          style: GoogleFonts.notoSansSc(
                              fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRoomCard(LanRoom room) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _connecting ? null : () => _joinRoom(room.ip, room.port),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.gold.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.gold.withOpacity(0.3)),
            ),
            child: Row(children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppTheme.gold.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.casino, color: AppTheme.gold, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(room.roomName,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(
                    '${room.host} · ${room.playerCount}/4 人 · ${room.ip}',
                    style:
                        const TextStyle(color: Colors.white38, fontSize: 12),
                  ),
                ]),
              ),
              Icon(Icons.chevron_right, color: AppTheme.gold.withOpacity(0.6)),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _textField(TextEditingController ctrl, String hint) {
    return TextField(
      controller: ctrl,
      style: const TextStyle(color: Colors.white, fontSize: 13),
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.black26,
        isDense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: AppTheme.gold.withOpacity(0.3)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: AppTheme.gold.withOpacity(0.3)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppTheme.gold),
        ),
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.white24, fontSize: 12),
      ),
    );
  }
}
