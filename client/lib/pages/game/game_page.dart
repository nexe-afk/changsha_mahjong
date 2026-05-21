import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../services/audio_service.dart';
import '../../services/game_state.dart';
import '../../services/lan_game_server.dart';
import '../../widgets/tile/tile_widget.dart';

class GamePage extends StatefulWidget {
  const GamePage({super.key});

  @override
  State<GamePage> createState() => _GamePageState();
}

class _GamePageState extends State<GamePage> with TickerProviderStateMixin {
  final _audio = AudioService();

  String _roomId = '';
  List<int> myHand = [];
  int mySeatIndex = -1;
  int dealerIndex = -1;
  int currentTurn = -1;
  int wallRemaining = 0;
  List<Map<String, dynamic>> availableActions = [];
  Map<int, List<int>> allPlayerDiscards = {};
  Map<int, List<List<int>>> allPlayerMelds = {};
  Map<int, int> allPlayerHandCounts = {};
  bool gameStarted = false;
  bool gameOver = false;
  int _selectedTileIndex = -1;
  int _lastDiscardSeat = -1;
  bool _autoPlay = false;

  // 特效
  String _effectText = '';
  Color _effectColor = AppTheme.gold;
  late AnimationController _effectAnimCtrl;
  late Animation<double> _effectScale;
  late Animation<double> _effectOpacity;

  // LAN mode
  bool _isLanMode = false;
  WebSocketChannel? _lanChannel;
  LanGameServer? _lanServer; // non-null when this device is the host
  StreamSubscription<dynamic>? _lanSub;

  // 定庄摇号动画
  bool _showDealerAnim = false;
  int _highlightAnimSeat = -1;
  late AnimationController _dealerAnimCtrl;
  late Animation<double> _dealerAnimValue;
  int _targetDealerSeat = -1;
  bool _dealerHideScheduled = false;

  // 扎鸟翻牌叠层
  bool _showBirdOverlay = false;
  List<int> _overlayBirdTileIds = [];
  List<int> _overlayBirdSeats = [];
  List<int> _overlayMultipliers = [];
  late AnimationController _birdAnimCtrl;

  @override
  void initState() {
    super.initState();
    // 特效动画
    _effectAnimCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _effectScale = CurvedAnimation(parent: _effectAnimCtrl, curve: Curves.elasticOut);
    _effectOpacity = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _effectAnimCtrl, curve: const Interval(0.4, 1.0, curve: Curves.easeOut)),
    );
    // 定庄摇号动画
    _dealerAnimCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 2500));
    _dealerAnimValue = CurvedAnimation(parent: _dealerAnimCtrl, curve: Curves.easeInOut);
    _dealerAnimCtrl.addListener(_onDealerAnimTick);

    // 扎鸟翻牌动画
    _birdAnimCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));

    // 从路由参数读取房间号 / LAN 参数
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is String) {
        _roomId = args;
      } else if (args is Map) {
        final mode = args['mode'] as String?;
        if (mode == 'lan') {
          _initLanMode(args);
          return;
        }
        _roomId = args['roomId'] as String? ?? '';
      }
      if (mounted) setState(() {});
    });
    _registerListeners();
    appState.addListener(_onAppStateChange);
  }

  void _onAppStateChange() {
    if (appState.socket != null && !gameStarted) {
      _registerListeners();
    }
  }

  // ── LAN mode ─────────────────────────────────────────────────────────────

  void _initLanMode(Map args) {
    _isLanMode = true;
    _lanServer = args['server'] as LanGameServer?;

    if (_lanServer != null) {
      // Host: receive events directly from the server (no WS round-trip).
      _lanServer!.onHostEvent = (event, data) {
        if (!mounted) return;
        _routeLanEvent(event, data);
      };
      // Start the game now that we have the event callback set up.
      Future.microtask(() => _lanServer!.startGame());
    } else {
      // Client: events arrive over the provided WebSocketChannel.
      final channel = args['channel'] as WebSocketChannel;
      _lanChannel = channel;
      _lanSub = channel.stream.listen(_onLanRaw, onDone: () {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('已与主机断开连接')),
          );
        }
      });
      // Send join
      _lanEmit('join', {'nickname': appState.nickname});
      // Send ready immediately
      _lanEmit('ready', {});
    }

    if (mounted) setState(() {});
  }

  void _onLanRaw(dynamic raw) {
    try {
      final msg = jsonDecode(raw as String) as Map<String, dynamic>;
      _routeLanEvent(msg['event'] as String, msg['data']);
    } catch (_) {}
  }

  void _routeLanEvent(String event, dynamic data) {
    switch (event) {
      case 'room:state':   _onRoomState(data); break;
      case 'game:dice':    _onGameDice(data); break;
      case 'game:start':   _onGameStart(data); break;
      case 'game:turn':    _onGameTurn(data); break;
      case 'game:tile_drawn':       _onTileDrawn(data); break;
      case 'game:tile_drawn_other': _onTileDrawnOther(data); break;
      case 'game:tile_discarded':   _onTileDiscarded(data); break;
      case 'game:action_prompt':    _onActionPrompt(data); break;
      case 'game:action_result':    _onActionResult(data); break;
      case 'game:initial_win':      _onInitialWin(data); break;
      case 'game:result':           _onResult(data); break;
      case 'game:bird_reveal':      _onBirdReveal(data); break;
      case 'game:final_scores':     _onFinalScores(data); break;
      case 'game:sea_roaming':      _onSeaRoaming(data); break;
      case 'error':                 _onError(data); break;
    }
  }

  void _lanEmit(String action, Map<String, dynamic> data) {
    if (_lanServer != null) {
      // Host acts directly on the engine (no WS).
      _lanServer!.hostAction(action, data);
    } else {
      _lanChannel?.sink.add(jsonEncode({'action': action, 'data': data}));
    }
  }

  bool _listenersRegistered = false;

  void _registerListeners() {
    final socket = appState.socket;
    if (socket == null || _listenersRegistered) return;
    _listenersRegistered = true;

    socket.on('room:state', _onRoomState);
    socket.on('game:dice', _onGameDice);
    socket.on('game:start', _onGameStart);
    socket.on('game:turn', _onGameTurn);
    socket.on('game:tile_drawn', _onTileDrawn);
    socket.on('game:tile_drawn_other', _onTileDrawnOther);
    socket.on('game:tile_discarded', _onTileDiscarded);
    socket.on('game:action_prompt', _onActionPrompt);
    socket.on('game:action_result', _onActionResult);
    socket.on('game:initial_win', _onInitialWin);
    socket.on('game:result', _onResult);
    socket.on('game:bird_reveal', _onBirdReveal);
    socket.on('game:final_scores', _onFinalScores);
    socket.on('game:sea_roaming', _onSeaRoaming);
    socket.on('error', _onError);
  }

  void _showEffect(String text, Color color) {
    setState(() {
      _effectText = text;
      _effectColor = color;
    });
    _effectAnimCtrl.reset();
    _effectAnimCtrl.forward();
  }

  @override
  void dispose() {
    _dealerAnimCtrl.removeListener(_onDealerAnimTick);
    _dealerAnimCtrl.dispose();
    _effectAnimCtrl.dispose();
    _birdAnimCtrl.dispose();
    appState.removeListener(_onAppStateChange);
    // LAN cleanup
    _lanSub?.cancel();
    _lanChannel?.sink.close();
    _lanServer?.stop();
    // Socket.IO cleanup
    final socket = appState.socket;
    if (socket != null) {
      const events = [
        'room:state', 'game:start', 'game:turn', 'game:tile_drawn', 'game:tile_drawn_other',
        'game:tile_discarded', 'game:action_prompt', 'game:action_result',
        'game:initial_win', 'game:result', 'game:bird_reveal', 'game:final_scores',
        'game:sea_roaming', 'error',
      ];
      socket.off('game:dice');
      for (final e in events) {
        socket.off(e);
      }
    }
    super.dispose();
  }

  static String tileSuit(int id) {
    if (id < 36) return 'wan';
    if (id < 72) return 'tiao';
    return 'tong';
  }

  static int tileValue(int id) => ((id % 36) ~/ 4) + 1;

  static int _toInt(dynamic v) {
    if (v is int) return v;
    if (v is double) return v.toInt();
    return 0;
  }

  int _absoluteSeat(int relative) => (mySeatIndex + relative) % 4;

  void _onRoomState(dynamic data) {
    final d = data as Map<String, dynamic>;
    final roomId = d['roomId'] as String? ?? '';
    if (roomId.isNotEmpty && mounted) {
      setState(() => _roomId = roomId);
    }
  }

  void _onGameDice(dynamic data) {
    final d = data as Map<String, dynamic>;
    final dealerIdx = _toInt(d['dealerIndex']);
    setState(() {
      _targetDealerSeat = dealerIdx;
      _showDealerAnim = true;
      _highlightAnimSeat = -1;
    });
    _dealerAnimCtrl.reset();
    _dealerAnimCtrl.forward();
  }

  void _onDealerAnimTick() {
    final t = _dealerAnimCtrl.value;
    int seat;
    if (t < 0.5) {
      // 快速轮转：约每 100ms 切换一次
      final steps = (t * 20).floor();
      seat = steps % 4;
    } else if (t < 0.85) {
      // 减速：逐渐停在目标附近
      final slowSteps = ((t - 0.5) * 15).floor();
      final offset = [0, 1, 2, 0, 1, 3, 2, 1, 0][slowSteps.clamp(0, 8)];
      seat = (_targetDealerSeat + offset) % 4;
    } else if (t < 0.92) {
      // 闪烁 1-2 次
      final blink = ((t - 0.85) / 0.07).floor() % 2 == 0;
      seat = blink ? _targetDealerSeat : -1;
    } else {
      // 稳定在庄家
      seat = _targetDealerSeat;
    }
    if (seat != _highlightAnimSeat) {
      setState(() => _highlightAnimSeat = seat);
    }
    // 动画结束：稳定2秒后再隐藏
    if (t >= 1.0 && mounted && !_dealerHideScheduled) {
      _dealerHideScheduled = true;
      setState(() => _highlightAnimSeat = _targetDealerSeat);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() {
            _showDealerAnim = false;
            _dealerHideScheduled = false;
          });
        }
      });
    }
  }

  void _onGameStart(dynamic data) {
    final d = data as Map<String, dynamic>;
    myHand = List<int>.from(d['handTileIds'] as List);
    myHand.sort();
    mySeatIndex = _toInt(d['yourSeatIndex']);
    dealerIndex = _toInt(d['dealerIndex']);
    wallRemaining = _toInt(d['wallRemaining']);
    // 如果定庄动画还在播，暂不显示牌桌
    if (_showDealerAnim || _dealerAnimCtrl.isAnimating) {
      // 等待动画结束再显示牌桌
      Future.doWhile(() async {
        await Future.delayed(const Duration(milliseconds: 100));
        return mounted && (_showDealerAnim || _dealerAnimCtrl.isAnimating);
      }).then((_) {
        if (mounted) _applyGameStart();
      });
      return;
    }
    _applyGameStart();
  }

  void _applyGameStart() {
    setState(() {
      gameStarted = true;
      allPlayerDiscards = {0: [], 1: [], 2: [], 3: []};
      allPlayerMelds = {0: [], 1: [], 2: [], 3: []};
      allPlayerHandCounts = {};
      for (int i = 0; i < 4; i++) {
        allPlayerHandCounts[i] = i == mySeatIndex ? myHand.length : 13;
      }
      _selectedTileIndex = -1;
      availableActions = [];
    });
  }

  void _onGameTurn(dynamic data) {
    final d = data as Map<String, dynamic>;
    setState(() {
      currentTurn = _toInt(d['seatIndex']);
      if (currentTurn != mySeatIndex) {
        _selectedTileIndex = -1;
      }
    });
  }

  void _onTileDrawn(dynamic data) {
    final d = data as Map<String, dynamic>;
    final tileId = _toInt(d['tileId']);
    _audio.playDraw();
    setState(() {
      myHand.add(tileId);
      myHand.sort();
      allPlayerHandCounts[mySeatIndex] = myHand.length;
      if (wallRemaining > 0) wallRemaining--;
    });
  }

  void _onTileDrawnOther(dynamic data) {
    final d = data as Map<String, dynamic>;
    final seat = _toInt(d['seatIndex']);
    setState(() {
      allPlayerHandCounts[seat] = (allPlayerHandCounts[seat] ?? 0) + 1;
      if (wallRemaining > 0) wallRemaining--;
    });
  }

  void _onTileDiscarded(dynamic data) {
    final d = data as Map<String, dynamic>;
    final seat = _toInt(d['seatIndex']);
    final tileId = _toInt(d['tileId']);
    _audio.playDiscard();
    setState(() {
      allPlayerDiscards[seat] = [...allPlayerDiscards[seat] ?? [], tileId];
      allPlayerHandCounts[seat] = (allPlayerHandCounts[seat] ?? 0) - 1;
      _lastDiscardSeat = seat;
      if (seat == mySeatIndex) {
        myHand.remove(tileId);
      }
    });
  }

  void _onActionPrompt(dynamic data) {
    final d = data as Map<String, dynamic>;
    setState(() {
      availableActions = List<Map<String, dynamic>>.from(
        (d['actions'] as List).map((a) {
          final action = Map<String, dynamic>.from(a as Map);
          // 修复吃牌：服务端传 tiles(Tile对象)，转换为 tileIds(int列表)
          if (action['type'] == 'chow' && action['options'] != null) {
            final opts = (action['options'] as List)
                .map((o) => Map<String, dynamic>.from(o as Map))
                .toList();
            // 提取第一个选项的 tileIds
            if (opts.isNotEmpty && opts[0]['tiles'] != null) {
              final firstTiles = opts[0]['tiles'] as List;
              action['tileIds'] = firstTiles
                  .map((t) => _toInt((t as Map<String, dynamic>)['id']))
                  .toList();
            }
          }
          return action;
        }),
      );
    });
  }

  void _onActionResult(dynamic data) {
    final d = data as Map<String, dynamic>;
    final seat = _toInt(d['seatIndex']);
    final action = d['action'] as String;
    final tiles = d['tiles'] != null ? List<int>.from(d['tiles'] as List) : <int>[];
    final fromSeat = d['fromSeat'] != null ? _toInt(d['fromSeat']) : _lastDiscardSeat;

    setState(() {
      availableActions = [];
      if ((action == 'pong' || action == 'kong' || action == 'chow') && fromSeat >= 0) {
        final discards = allPlayerDiscards[fromSeat];
        if (discards != null && discards.isNotEmpty) {
          discards.removeLast();
        }
      }
    });

    switch (action) {
      case 'pong':
        _audio.playPong();
        _showEffect('碰', Colors.orangeAccent);
        setState(() {
          allPlayerMelds[seat] = [...allPlayerMelds[seat] ?? [], tiles];
          if (seat == mySeatIndex) {
            for (final t in tiles) {
              myHand.remove(t);
            }
          }
          allPlayerHandCounts[seat] = seat == mySeatIndex ? myHand.length : (allPlayerHandCounts[seat] ?? 0) - 2;
        });
        break;
      case 'kong':
        _audio.playKong();
        _showEffect('杠', Colors.redAccent);
        setState(() {
          allPlayerMelds[seat] = [...allPlayerMelds[seat] ?? [], tiles];
          if (seat == mySeatIndex) {
            for (final t in tiles) {
              myHand.remove(t);
            }
          }
          allPlayerHandCounts[seat] = seat == mySeatIndex ? myHand.length : (allPlayerHandCounts[seat] ?? 0) - 3;
        });
        break;
      case 'chow':
        _showEffect('吃', Colors.lightBlueAccent);
        setState(() {
          allPlayerMelds[seat] = [...allPlayerMelds[seat] ?? [], tiles];
          if (seat == mySeatIndex) {
            for (final t in tiles) {
              myHand.remove(t);
            }
          }
          allPlayerHandCounts[seat] = seat == mySeatIndex ? myHand.length : (allPlayerHandCounts[seat] ?? 0) - 2;
        });
        break;
      case 'win':
        _audio.playWin();
        _showEffect('胡牌!', AppTheme.gold);
        break;
    }
  }

  void _onInitialWin(dynamic data) {
    final d = data as Map<String, dynamic>;
    final wins = d['wins'] as List;
    if (wins.isNotEmpty) {
      _audio.playWin();
    }
  }

  Map<String, dynamic>? _lastBirdData;

  void _onResult(dynamic data) {
    final d = data as Map<String, dynamic>;
    final winners = (d['winnerIndex'] as List?) ?? [];
    final isDraw = winners.isEmpty;
    setState(() {
      gameOver = true;
      availableActions = [];
    });
    if (isDraw) {
      _showEffect('流局', Colors.white54);
    }
    // Win: bird animation already shown during 3s server delay → navigate quickly.
    // Draw: show "流局" effect briefly before navigating.
    final delay = isDraw ? 2000 : 500;
    Future.delayed(Duration(milliseconds: delay), () {
      if (!mounted) return;
      final resultData = {
        ...d,
        'birdData': _lastBirdData,
        'mySeatIndex': mySeatIndex,
        'dealerIndex': dealerIndex,
      };
      if (_lastBirdData != null && _lastBirdData!['birdTiles'] != null) {
        final raw = _lastBirdData!['birdTiles'] as List;
        final birdTileIds = raw.map((e) => (e as num).toInt()).toList();
        resultData['birdLabels'] = birdTileIds.map((id) => _tileLabel(id)).toList();
      }
      Navigator.pushReplacementNamed(context, '/result', arguments: resultData);
    });
  }

  void _onBirdReveal(dynamic data) {
    _audio.playBirdReveal();
    final d = Map<String, dynamic>.from(data as Map);
    _lastBirdData = d;
    final rawTiles = d['birdTiles'] as List? ?? [];
    final rawSeats = d['birdSeats'] as List? ?? [];
    final rawMults = d['multipliers'] as List? ?? [];
    setState(() {
      _overlayBirdTileIds = rawTiles.map((e) => (e as num).toInt()).toList();
      _overlayBirdSeats = rawSeats.map((e) => (e as num).toInt()).toList();
      _overlayMultipliers = rawMults.map((e) => (e as num).toInt()).toList();
      _showBirdOverlay = true;
    });
    _birdAnimCtrl.reset();
    _birdAnimCtrl.forward();
  }

  String _tileLabel(int id) {
    const cn = ['一','二','三','四','五','六','七','八','九'];
    final val = ((id % 36) ~/ 4).clamp(0, 8);
    final suit = (id ~/ 36).clamp(0, 2);
    final suitName = ['万','条','筒'][suit];
    return '${cn[val]}$suitName';
  }

  String _playerNickname(int seatIndex) {
    if (seatIndex == mySeatIndex) return '你';
    final nicknames = ['玩家-1','玩家-2','玩家-3'];
    final rel = (seatIndex - mySeatIndex) % 4;
    return nicknames[(rel + 4) % 4];
  }

  void _onFinalScores(dynamic data) {}

  void _onSeaRoaming(dynamic data) {
    final d = data as Map<String, dynamic>;
    final seat = _toInt(d['currentSeatIndex']);
    final tileId = _toInt(d['tileId']);
    setState(() {
      currentTurn = seat;
      if (d['isYourTurn'] == true) {
        myHand.add(tileId);
        myHand.sort();
        allPlayerHandCounts[mySeatIndex] = myHand.length;
      }
    });
  }

  void _onError(dynamic data) {
    if (!mounted) return;
    final d = data as Map<String, dynamic>;
    final msg = d['message'] as String? ?? '未知错误';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppTheme.accent),
    );
  }

  void _toggleAutoPlay() {
    if (_isLanMode) return; // autoPlay not supported in LAN mode
    final next = !_autoPlay;
    setState(() {
      _autoPlay = next;
      if (next) _selectedTileIndex = -1;
    });
    appState.socket?.emit(next ? 'game:autoPlay' : 'game:cancelAutoPlay', {});
  }

  void _onDiscardTile(int index) {
    if (currentTurn != mySeatIndex || gameOver) return;
    if (index < 0 || index >= myHand.length) return;
    final tileId = myHand[index];
    if (_isLanMode) {
      _lanEmit('discard', {'tileId': tileId});
    } else {
      appState.socket?.emit('game:discard', {'tileId': tileId});
    }
    setState(() => _selectedTileIndex = -1);
  }

  void _onActionTap(String type, [Map<String, dynamic>? options]) {
    if (_isLanMode) {
      switch (type) {
        case 'pong':
          _lanEmit('pong', {});
          break;
        case 'kong':
          _lanEmit('kong', {
            'tileId': options?['tileId'] ?? 0,
            'kongType': options?['kongType'] ?? 'ming',
          });
          break;
        case 'win':
          _lanEmit('win', {});
          break;
        case 'chow':
          final tileIds = options?['tileIds'];
          _lanEmit('chow', {
            'tileIds': tileIds is List ? tileIds.cast<int>().toList() : <int>[],
          });
          break;
        case 'pass':
          _lanEmit('pass', {});
          break;
      }
      setState(() => availableActions = []);
      return;
    }

    final socket = appState.socket;
    if (socket == null) return;
    switch (type) {
      case 'pong':
        socket.emit('game:pong', null);
        break;
      case 'kong':
        socket.emit('game:kong', {
          'tileId': options?['tileId'],
          'kongType': options?['kongType'] ?? 'ming',
        });
        break;
      case 'win':
        socket.emit('game:win', null);
        break;
      case 'chow':
        final tileIds = options?['tileIds'];
        if (tileIds is List && tileIds.isNotEmpty) {
          socket.emit('game:chow', {'tileIds': tileIds.cast<int>().toList()});
        } else {
          socket.emit('game:chow', {'tileIds': []});
        }
        break;
      case 'pass':
        socket.emit('game:pass', null);
        break;
    }
    setState(() => availableActions = []);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0D2B24), Color(0xFF1A3C34), Color(0xFF0D2B24)],
          ),
        ),
        child: SafeArea(
          child: !gameStarted
              ? _buildWaitingScreen()
              : Column(children: [
                  _buildAutoPlayBar(),
                  _buildTopOpponent(),
                  Expanded(child: Row(children: [
                    _buildLeftOpponent(),
                    Expanded(child: _buildDiscardPool()),
                    _buildRightOpponent(),
                  ])),
                  if (availableActions.isNotEmpty && !_autoPlay) _buildActionButtons(),
                  _buildMyHand(),
                  _buildBottomBar(),
                ]),
        ),
      ),
          // 定庄摇号叠层
          if (_showDealerAnim)
            _buildDealerAnim(),
          // 扎鸟翻牌叠层
          if (_showBirdOverlay)
            _buildBirdOverlay(),
          // 动作特效覆盖层
          if (_effectAnimCtrl.isAnimating && _effectText.isNotEmpty)
            IgnorePointer(
              child: AnimatedBuilder(
                animation: _effectAnimCtrl,
                builder: (context, _) {
                  return Opacity(
                    opacity: _effectOpacity.value,
                    child: Transform.scale(
                      scale: _effectScale.value,
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                          decoration: BoxDecoration(
                            color: _effectColor.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: _effectColor, width: 3),
                          ),
                          child: Text(
                            _effectText,
                            style: TextStyle(
                              fontSize: 72,
                              fontWeight: FontWeight.bold,
                              color: _effectColor,
                              fontFamily: 'NotoSerifCJKsc',
                              shadows: [
                                Shadow(color: Colors.black54, blurRadius: 8, offset: const Offset(2, 2)),
                                Shadow(color: _effectColor.withOpacity(0.5), blurRadius: 20),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildWaitingScreen() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (_roomId.isNotEmpty) ...[
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.meeting_room, color: AppTheme.gold, size: 20),
              const SizedBox(width: 8),
              Text('房间: $_roomId',
                style: GoogleFonts.notoSerifSc(color: AppTheme.gold, fontSize: 18, fontWeight: FontWeight.bold)),
            ]),
            const SizedBox(height: 16),
          ],
          const SizedBox(
            width: 48, height: 48,
            child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 3),
          ),
          const SizedBox(height: 20),
          Text('等待游戏开始...',
            style: GoogleFonts.notoSansSc(color: Colors.white54, fontSize: 16, letterSpacing: 2)),
          const SizedBox(height: 8),
          Text('AI 玩家正在准备中',
            style: GoogleFonts.notoSansSc(color: Colors.white38, fontSize: 13, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildDealerAnim() {
    // 四个座位的标签
    const labels = ['你', '下家', '对家', '上家'];
    final dealer = _targetDealerSeat;

    Color seatColor(int seat) {
      if (seat == _highlightAnimSeat) return AppTheme.gold;
      if (seat == dealer) return Colors.amber.shade200;
      return Colors.white38;
    }

    double seatScale(int seat) {
      if (seat == _highlightAnimSeat) return 1.3;
      return 1.0;
    }

    return IgnorePointer(
      child: Container(
        color: Colors.black54,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('🎲 掷骰定庄中...',
                style: GoogleFonts.notoSerifSc(
                  fontSize: 28, color: AppTheme.gold,
                  fontWeight: FontWeight.bold,
                  shadows: [Shadow(color: Colors.black87, blurRadius: 8, offset: Offset(2, 2))],
                ),
              ),
              const SizedBox(height: 40),
              // 四个座位循环高亮
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(4, (i) {
                  return Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8),
                    child: AnimatedScale(
                      scale: seatScale(i),
                      duration: const Duration(milliseconds: 150),
                      child: Container(
                        width: 80,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: seatColor(i).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: seatColor(i),
                            width: _highlightAnimSeat == i ? 3 : 1,
                          ),
                          boxShadow: _highlightAnimSeat == i
                              ? [BoxShadow(color: AppTheme.gold.withOpacity(0.5), blurRadius: 20, spreadRadius: 4)]
                              : null,
                        ),
                        child: Column(children: [
                          Icon(Icons.person, color: seatColor(i), size: 32),
                          const SizedBox(height: 4),
                          Text(labels[i],
                            style: TextStyle(
                              color: seatColor(i),
                              fontSize: 14,
                              fontWeight: _highlightAnimSeat == i ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                          if (_highlightAnimSeat == i && _dealerAnimCtrl.value >= 0.9 &&
                              i == dealer) ...[
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.gold,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text('庄',
                                style: TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ]),
                      ),
                    ),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAutoPlayBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      child: Row(
        children: [
          // 房间号（左侧）
          if (_roomId.isNotEmpty)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.meeting_room, color: AppTheme.gold, size: 14),
                const SizedBox(width: 4),
                Text('$_roomId',
                  style: TextStyle(color: AppTheme.gold.withOpacity(0.7), fontSize: 12)),
              ],
            ),
          const Spacer(),
          GestureDetector(
            onTap: _toggleAutoPlay,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: _autoPlay ? AppTheme.gold : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _autoPlay ? AppTheme.gold : AppTheme.gold.withOpacity(0.5),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _autoPlay ? Icons.smart_toy : Icons.smart_toy_outlined,
                    color: _autoPlay ? AppTheme.primaryGreen : AppTheme.gold,
                    size: 14,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _autoPlay ? '取消托管' : 'AI 托管',
                    style: GoogleFonts.notoSansSc(
                      color: _autoPlay ? AppTheme.primaryGreen : AppTheme.gold,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopOpponent() {
    if (mySeatIndex < 0) return const SizedBox.shrink();
    final seat = _absoluteSeat(2);
    final count = allPlayerHandCounts[seat] ?? 0;
    final discards = allPlayerDiscards[seat] ?? [];
    final melds = allPlayerMelds[seat] ?? [];
    final isCurrentTurn = currentTurn == seat;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05))),
      ),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: isCurrentTurn ? AppTheme.gold.withOpacity(0.2) : Colors.black26,
            borderRadius: BorderRadius.circular(12),
            border: isCurrentTurn ? Border.all(color: AppTheme.gold, width: 1) : null,
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.person, color: AppTheme.gold, size: 16),
            const SizedBox(width: 4),
            Text('对家${seat == dealerIndex ? ' (庄)' : ''}',
              style: TextStyle(
                color: AppTheme.gold,
                fontSize: 12,
                fontWeight: isCurrentTurn ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('$count张', style: const TextStyle(color: Colors.white70, fontSize: 11)),
            ),
          ]),
        ),
        const SizedBox(height: 4),
        SizedBox(
          height: 32,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: count,
            shrinkWrap: true,
            itemBuilder: (_, __) => const TileWidget(
              suit: 'wan', value: 1, faceUp: false, width: 18, height: 28,
            ),
          ),
        ),
        if (melds.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: _buildMeldsHorizontal(melds),
          ),
        if (discards.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: _buildDiscardsHorizontal(discards, small: true),
          ),
      ]),
    );
  }

  Widget _buildLeftOpponent() {
    if (mySeatIndex < 0) return const SizedBox.shrink();
    final seat = _absoluteSeat(3);
    final count = allPlayerHandCounts[seat] ?? 0;
    final discards = allPlayerDiscards[seat] ?? [];
    final melds = allPlayerMelds[seat] ?? [];
    final isCurrentTurn = currentTurn == seat;

    return Container(
      width: 80,
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      decoration: BoxDecoration(
        border: Border(right: BorderSide(color: Colors.white.withOpacity(0.05))),
      ),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          decoration: BoxDecoration(
            color: isCurrentTurn ? AppTheme.gold.withOpacity(0.2) : Colors.black26,
            borderRadius: BorderRadius.circular(12),
            border: isCurrentTurn ? Border.all(color: AppTheme.gold, width: 1) : null,
          ),
          child: Column(children: [
            const Icon(Icons.person, color: AppTheme.gold, size: 16),
            Text('上家${seat == dealerIndex ? ' (庄)' : ''}',
              style: TextStyle(
                color: AppTheme.gold,
                fontSize: 10,
                fontWeight: isCurrentTurn ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            Text('$count张', style: const TextStyle(color: Colors.white70, fontSize: 10)),
          ]),
        ),
        const SizedBox(height: 4),
        Expanded(
          child: SingleChildScrollView(
            child: Column(children: [
              Wrap(
                direction: Axis.vertical,
                alignment: WrapAlignment.center,
                children: List.generate(count.clamp(0, 20), (_) =>
                  const TileWidget(suit: 'wan', value: 1, faceUp: false, width: 18, height: 24),
                ),
              ),
              if (melds.isNotEmpty) ...[
                const SizedBox(height: 4),
                _buildMeldsVertical(melds),
              ],
              if (discards.isNotEmpty) ...[
                const SizedBox(height: 4),
                _buildDiscardsVertical(discards, small: true),
              ],
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _buildRightOpponent() {
    if (mySeatIndex < 0) return const SizedBox.shrink();
    final seat = _absoluteSeat(1);
    final count = allPlayerHandCounts[seat] ?? 0;
    final discards = allPlayerDiscards[seat] ?? [];
    final melds = allPlayerMelds[seat] ?? [];
    final isCurrentTurn = currentTurn == seat;

    return Container(
      width: 80,
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: Colors.white.withOpacity(0.05))),
      ),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          decoration: BoxDecoration(
            color: isCurrentTurn ? AppTheme.gold.withOpacity(0.2) : Colors.black26,
            borderRadius: BorderRadius.circular(12),
            border: isCurrentTurn ? Border.all(color: AppTheme.gold, width: 1) : null,
          ),
          child: Column(children: [
            const Icon(Icons.person, color: AppTheme.gold, size: 16),
            Text('下家${seat == dealerIndex ? ' (庄)' : ''}',
              style: TextStyle(
                color: AppTheme.gold,
                fontSize: 10,
                fontWeight: isCurrentTurn ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            Text('$count张', style: const TextStyle(color: Colors.white70, fontSize: 10)),
          ]),
        ),
        const SizedBox(height: 4),
        Expanded(
          child: SingleChildScrollView(
            child: Column(children: [
              Wrap(
                direction: Axis.vertical,
                alignment: WrapAlignment.center,
                children: List.generate(count.clamp(0, 20), (_) =>
                  const TileWidget(suit: 'wan', value: 1, faceUp: false, width: 18, height: 24),
                ),
              ),
              if (melds.isNotEmpty) ...[
                const SizedBox(height: 4),
                _buildMeldsVertical(melds),
              ],
              if (discards.isNotEmpty) ...[
                const SizedBox(height: 4),
                _buildDiscardsVertical(discards, small: true),
              ],
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _buildDiscardPool() {
    if (mySeatIndex < 0) return const SizedBox.shrink();
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          margin: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: const Color(0xFF0D5E3A).withOpacity(0.6),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.gold.withOpacity(0.15), width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: GridView.count(
            crossAxisCount: 2,
            padding: const EdgeInsets.all(6),
            mainAxisSpacing: 3,
            crossAxisSpacing: 3,
            childAspectRatio: 2.5,
            children: [
              for (int rel = 0; rel < 4; rel++)
                _buildDiscardSection(_absoluteSeat(rel), rel),
            ],
          ),
        ),
        if (_autoPlay)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.65),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppTheme.gold, width: 1.5),
            ),
            child: Text(
              '🤖 托管中',
              style: GoogleFonts.notoSerifSc(
                color: AppTheme.gold,
                fontSize: 14,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildDiscardSection(int seat, int relative) {
    final discards = allPlayerDiscards[seat] ?? [];
    final labels = ['我', '下家', '对家', '上家'];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.black12,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${labels[relative]}${seat == dealerIndex ? '(庄)' : ''}',
          style: const TextStyle(color: Colors.white38, fontSize: 10)),
        const SizedBox(height: 2),
        Expanded(
          child: Wrap(
            spacing: 1,
            runSpacing: 1,
            children: discards.map((id) => TileWidget(
              suit: tileSuit(id),
              value: tileValue(id),
              faceUp: true,
              width: 20,
              height: 26,
            )).toList(),
          ),
        ),
      ]),
    );
  }

  Widget _buildMyHand() {
    return Container(
      constraints: const BoxConstraints(minHeight: 80),
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.transparent, Color(0x44000000)],
        ),
        border: Border(
          top: BorderSide(color: Colors.white12, width: 0.5),
        ),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        if (allPlayerMelds[mySeatIndex]?.isNotEmpty ?? false)
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: _buildMeldsHorizontal(allPlayerMelds[mySeatIndex]!),
          ),
        SizedBox(
          height: 72,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            itemCount: myHand.length,
            itemBuilder: (_, i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1),
              child: TileWidget(
                suit: tileSuit(myHand[i]),
                value: tileValue(myHand[i]),
                faceUp: true,
                selected: i == _selectedTileIndex,
                width: 38,
                height: 54,
                onTap: currentTurn == mySeatIndex && !gameOver && !_autoPlay
                    ? () => setState(() => _selectedTileIndex = _selectedTileIndex == i ? -1 : i)
                    : null,
              ),
            ),
          ),
        ),
        if (_selectedTileIndex >= 0 && currentTurn == mySeatIndex && !gameOver)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: ElevatedButton(
              onPressed: () => _onDiscardTile(_selectedTileIndex),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.gold,
                foregroundColor: AppTheme.primaryGreen,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 6),
              ),
              child: const Text('出牌', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
      ]),
    );
  }

  Widget _buildActionButtons() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.black26,
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.08)),
          bottom: BorderSide(color: Colors.white.withOpacity(0.08)),
        ),
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        for (final action in availableActions) ...[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: _actionBtn(
              _actionLabel(action['type'] as String),
              _actionColor(action['type'] as String),
              () {
                final type = action['type'] as String;
                final opts = Map<String, dynamic>.from(action);
                // 对非吃牌：options 里有额外参数
                if (action['options'] != null && action['options'] is Map) {
                  opts.addAll(Map<String, dynamic>.from(action['options'] as Map));
                }
                _onActionTap(type, opts);
              },
            ),
          ),
        ],
      ]),
    );
  }

  Widget _actionBtn(String text, Color color, VoidCallback onPressed) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        elevation: 3,
        shadowColor: color.withOpacity(0.4),
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 2),
      ),
    );
  }

  String _actionLabel(String type) {
    switch (type) {
      case 'pong': return '碰';
      case 'kong': return '杠';
      case 'win': return '胡';
      case 'chow': return '吃';
      case 'pass': return '过';
      default: return type;
    }
  }

  Color _actionColor(String type) {
    switch (type) {
      case 'pong': return Colors.orange;
      case 'kong': return Colors.blue;
      case 'win': return AppTheme.accent;
      case 'chow': return Colors.teal;
      case 'pass': return Colors.grey;
      default: return Colors.grey;
    }
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0x44000000), Color(0x88000000)],
        ),
      ),
      child: Row(children: [
        const Icon(Icons.layers, color: Colors.white54, size: 18),
        const SizedBox(width: 4),
        Text('余$wallRemaining', style: const TextStyle(color: Colors.white54, fontSize: 13)),
        const SizedBox(width: 16),
        if (currentTurn >= 0)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: currentTurn == mySeatIndex ? AppTheme.gold.withOpacity(0.2) : Colors.transparent,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              currentTurn == mySeatIndex ? '轮到你出牌' : '等待中...',
              style: TextStyle(
                color: currentTurn == mySeatIndex ? AppTheme.gold : Colors.white38,
                fontSize: 13,
              ),
            ),
          ),
        const Spacer(),
        const Icon(Icons.monetization_on, color: AppTheme.gold, size: 18),
        const SizedBox(width: 4),
        Text(appState.coins, style: const TextStyle(color: AppTheme.gold, fontSize: 13)),
      ]),
    );
  }

  Widget _buildMeldsHorizontal(List<List<int>> melds) {
    return Wrap(
      spacing: 4,
      runSpacing: 2,
      alignment: WrapAlignment.center,
      children: melds.map((meld) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        decoration: BoxDecoration(
          color: Colors.black26,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: meld.map((id) => TileWidget(
          suit: tileSuit(id),
          value: tileValue(id),
          faceUp: true,
          width: 22,
          height: 30,
        )).toList()),
      )).toList(),
    );
  }

  Widget _buildMeldsVertical(List<List<int>> melds) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: melds.map((meld) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 1),
        child: Column(mainAxisSize: MainAxisSize.min, children: meld.map((id) => TileWidget(
          suit: tileSuit(id),
          value: tileValue(id),
          faceUp: true,
          width: 22,
          height: 26,
        )).toList()),
      )).toList(),
    );
  }

  Widget _buildDiscardsHorizontal(List<int> discards, {bool small = false}) {
    final w = small ? 16.0 : 20.0;
    final h = small ? 22.0 : 26.0;
    return Wrap(
      spacing: 1,
      runSpacing: 1,
      children: discards.map((id) => TileWidget(
        suit: tileSuit(id),
        value: tileValue(id),
        faceUp: true,
        width: w,
        height: h,
      )).toList(),
    );
  }

  Widget _buildDiscardsVertical(List<int> discards, {bool small = false}) {
    final w = small ? 16.0 : 20.0;
    final h = small ? 22.0 : 26.0;
    return Wrap(
      direction: Axis.vertical,
      spacing: 1,
      runSpacing: 1,
      children: discards.map((id) => TileWidget(
        suit: tileSuit(id),
        value: tileValue(id),
        faceUp: true,
        width: w,
        height: h,
      )).toList(),
    );
  }

  Widget _buildBirdOverlay() {
    const suitNames = ['wan', 'tiao', 'tong'];
    const relLabels = ['你', '下家', '对家', '上家'];
    return AnimatedBuilder(
      animation: _birdAnimCtrl,
      builder: (context, _) {
        final animVal = _birdAnimCtrl.value;
        return Container(
          color: Colors.black.withOpacity(0.78),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '扎鸟',
                  style: GoogleFonts.notoSerifSc(
                    color: AppTheme.gold,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 4,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(_overlayBirdTileIds.length, (i) {
                    final tileId = _overlayBirdTileIds[i];
                    final seat = i < _overlayBirdSeats.length ? _overlayBirdSeats[i] : -1;
                    final mult = seat >= 0 && seat < _overlayMultipliers.length
                        ? _overlayMultipliers[seat]
                        : 1;
                    final relIdx = seat >= 0 ? ((seat - mySeatIndex) % 4 + 4) % 4 : 0;
                    final seatLabel = seat >= 0 ? relLabels[relIdx] : '';
                    final suitIdx = (tileId ~/ 36).clamp(0, 2);
                    final value = (((tileId % 36) ~/ 4) + 1).clamp(1, 9);
                    final isRed = value == 5 && (suitIdx == 0 || suitIdx == 2);

                    Widget tileW;
                    if (animVal < 0.5) {
                      final angle = animVal * math.pi;
                      tileW = Transform(
                        alignment: Alignment.center,
                        transform: Matrix4.rotationY(angle),
                        child: const TileWidget(suit: 'wan', value: 1, faceUp: false, width: 56, height: 72),
                      );
                    } else {
                      final angle = (1 - animVal) * math.pi;
                      tileW = Transform(
                        alignment: Alignment.center,
                        transform: Matrix4.rotationY(angle),
                        child: TileWidget(
                          suit: suitNames[suitIdx],
                          value: value,
                          faceUp: true,
                          isRedTile: isRed,
                          width: 56,
                          height: 72,
                        ),
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          tileW,
                          const SizedBox(height: 6),
                          Text(
                            _tileLabel(tileId),
                            style: const TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                          if (seatLabel.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              seatLabel,
                              style: const TextStyle(color: AppTheme.gold, fontSize: 14, fontWeight: FontWeight.w600),
                            ),
                            Text(
                              'x$mult',
                              style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ],
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
