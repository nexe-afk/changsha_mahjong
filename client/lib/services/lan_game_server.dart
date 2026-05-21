import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import '../game_engine/engine.dart';
import 'lan_discovery.dart';

// ── per-seat state ─────────────────────────────────────────────────────────

class LanSeat {
  final int index;
  String nickname;
  WebSocket? socket; // null until WS connection arrives
  bool isReady = false;

  LanSeat(this.index, this.nickname);
}

// ── server ─────────────────────────────────────────────────────────────────

/// WebSocket game server that runs inside the host's Flutter process.
///
/// Lifecycle:
///   1. [start] – binds an HTTP server, registers mDNS broadcast.
///   2. Clients connect and send {"action":"join","data":{"nickname":"…"}}.
///   3. Host calls [startGame] (or it auto-starts when [autoStart] players join).
///   4. Game events flow to all seats via WebSocket.
///   5. [stop] tears everything down.
class LanGameServer {
  final String roomId;
  final String roomName;
  final String hostNickname;

  HttpServer? _http;
  int _port = 0;
  GameEngine? _engine;
  bool _gameStarted = false;
  LanDiscovery? _discovery;

  final List<LanSeat> _seats = List.generate(4, (i) => LanSeat(i, ''));
  int _connected = 0; // seats 1-3 (host = seat 0, no WS needed)

  // Seat-0 events delivered directly to the host UI (no WS round-trip).
  void Function(String event, dynamic data)? onHostEvent;
  // Called whenever room membership changes.
  void Function(List<Map<String, dynamic>> players, int count)? onRoomChanged;

  LanGameServer({
    required this.roomId,
    required this.roomName,
    required this.hostNickname,
  }) {
    _seats[0].nickname = hostNickname;
    _seats[0].isReady = true; // host is always ready
  }

  int get port => _port;
  bool get gameStarted => _gameStarted;

  // ── startup ──────────────────────────────────────────────────────────────

  Future<void> start() async {
    // Find an available port in [9876, 9900).
    for (int p = 9876; p < 9900; p++) {
      try {
        _http = await HttpServer.bind(InternetAddress.anyIPv4, p,
            shared: false);
        _port = p;
        break;
      } catch (_) {}
    }
    if (_http == null) throw Exception('No available port in 9876-9899');

    _http!.listen(_handleRequest);
    _startBroadcast();
  }

  void _startBroadcast() {
    _discovery = LanDiscovery();
    _discovery!.startBroadcast(
      roomId: roomId,
      roomName: roomName,
      host: hostNickname,
      gamePort: _port,
      playerCount: 1,
    );
  }

  // ── HTTP / WebSocket ──────────────────────────────────────────────────────

  Future<void> _handleRequest(HttpRequest req) async {
    if (!WebSocketTransformer.isUpgradeRequest(req)) {
      req.response
        ..statusCode = 200
        ..write(jsonEncode({
          'roomId': roomId,
          'roomName': roomName,
          'host': hostNickname,
          'players': _playerList(),
          'started': _gameStarted,
        }))
        ..close();
      return;
    }

    // Find an empty seat (seats 1-3 for remote clients).
    int? seat;
    for (int i = 1; i < 4; i++) {
      if (_seats[i].socket == null || _seats[i].socket!.closeCode != null) {
        seat = i;
        break;
      }
    }
    if (seat == null) {
      // Room full
      final ws = await WebSocketTransformer.upgrade(req);
      ws.add(jsonEncode({
        'event': 'error',
        'data': {'message': '房间已满'},
      }));
      await ws.close();
      return;
    }

    final ws = await WebSocketTransformer.upgrade(req);
    final s = seat;
    _seats[s].socket = ws;
    _seats[s].nickname = '玩家${s + 1}';
    _seats[s].isReady = false;
    _connected++;

    // Send initial room state to the newly connected client.
    _sendTo(s, 'room:state', _roomStateData());

    ws.listen(
      (msg) => _onClientMessage(s, msg as String),
      onDone: () => _onClientDisconnect(s),
      onError: (_) => _onClientDisconnect(s),
      cancelOnError: false,
    );
  }

  // ── message routing ───────────────────────────────────────────────────────

  void _onClientMessage(int seat, String raw) {
    try {
      final msg = jsonDecode(raw) as Map<String, dynamic>;
      final action = msg['action'] as String? ?? '';
      final data = (msg['data'] as Map<String, dynamic>?) ?? {};
      _processAction(seat, action, data);
    } catch (_) {}
  }

  void _processAction(int seat, String action, Map<String, dynamic> data) {
    if (!_gameStarted) {
      switch (action) {
        case 'join':
          _seats[seat].nickname = data['nickname'] as String? ?? _seats[seat].nickname;
          _broadcastRoomState();
          break;
        case 'ready':
          _seats[seat].isReady = true;
          _broadcastRoomState();
          _maybeAutoStart();
          break;
      }
      return;
    }

    final engine = _engine;
    if (engine == null) return;

    List<GameEvent> events;
    switch (action) {
      case 'discard':
        events = engine.discard(seat, data['tileId'] as int);
        break;
      case 'pong':
        events = engine.pong(seat);
        break;
      case 'kong':
        events = engine.kong(
          seat,
          data['tileId'] as int? ?? 0,
          data['kongType'] as String? ?? 'ming',
        );
        break;
      case 'chow':
        events = engine.chow(seat, List<int>.from(data['tileIds'] as List));
        break;
      case 'win':
        events = engine.win(seat);
        break;
      case 'pass':
        events = engine.pass(seat);
        break;
      default:
        events = [];
    }

    _dispatchEvents(events);
  }

  // Called by the host UI to perform an action as seat 0.
  void hostAction(String action, Map<String, dynamic> data) {
    _processAction(0, action, data);
  }

  // ── game control ──────────────────────────────────────────────────────────

  void _maybeAutoStart() {
    final readyCount = _seats.where((s) => s.isReady).length;
    if (readyCount >= 4) startGame();
  }

  /// Starts the game immediately (host calls this).
  /// Empty seats receive AI behaviour (simple pass-then-discard).
  void startGame() {
    if (_gameStarted) return;
    _gameStarted = true;
    _discovery?.stop();

    // Mark unfilled seats as AI.
    for (int i = 1; i < 4; i++) {
      if (_seats[i].socket == null || _seats[i].socket!.closeCode != null) {
        _seats[i].nickname = 'AI-${i + 1}';
        _seats[i].isReady = true;
      }
    }

    final rng = Random();
    final dice1 = 1 + rng.nextInt(6);
    final dice2 = 1 + rng.nextInt(6);
    final sum = dice1 + dice2;
    final dealerIndex = sum % 4;

    _broadcastAll('game:dice', {
      'dice1': dice1,
      'dice2': dice2,
      'sum': sum,
      'dealerIndex': dealerIndex,
    });

    // Give clients time to show the dice animation before dealing.
    Future.delayed(const Duration(milliseconds: 3200), () {
      _engine = GameEngine(dealerIndex: dealerIndex);
      _engine!.onEvents = _dispatchEvents;
      final events = _engine!.start();
      _dispatchEvents(events);
      _scheduleAiTurns();
    });
  }

  // ── AI ────────────────────────────────────────────────────────────────────

  void _scheduleAiTurns() {
    // Listen to game:turn events and auto-play for AI seats.
    // We intercept via onHostEvent relay; for simplicity we just hook
    // into the engine turn via a periodic poll is messy —
    // instead we override onEvents to watch for game:turn.
    final prevCb = _engine?.onEvents;
    _engine?.onEvents = (events) {
      prevCb?.call(events);
      _dispatchEvents(events);
      for (final e in events) {
        if (e.event == 'game:turn') {
          final turnSeat = (e.data as Map)['seatIndex'] as int;
          _maybeAiDiscard(turnSeat);
        }
        if (e.event == 'game:action_prompt') {
          final targets = e.targets ?? [];
          for (final s in targets) {
            if (_isAiSeat(s)) {
              Future.delayed(const Duration(milliseconds: 600), () {
                final passEvents = _engine?.pass(s) ?? [];
                _dispatchEvents(passEvents);
              });
            }
          }
        }
      }
    };
  }

  bool _isAiSeat(int seat) {
    return seat > 0 &&
        (_seats[seat].socket == null || _seats[seat].socket!.closeCode != null);
  }

  void _maybeAiDiscard(int seat) {
    if (!_isAiSeat(seat)) return;
    Future.delayed(const Duration(milliseconds: 800), () {
      final hand = _engine != null ? _aiHand(seat) : <int>[];
      if (hand.isEmpty) return;
      // Discard last tile (simple strategy).
      final events = _engine?.discard(seat, hand.last) ?? [];
      _dispatchEvents(events);
    });
  }

  List<int> _aiHand(int seat) {
    // Access engine's player hand via game events is not direct;
    // we track it ourselves from game:start / game:tile_drawn.
    return _aiHands[seat] ?? [];
  }

  final Map<int, List<int>> _aiHands = {};

  // ── event dispatch ────────────────────────────────────────────────────────

  void _dispatchEvents(List<GameEvent> events) {
    for (final e in events) {
      // Track AI hands so AI can pick a discard tile.
      _trackAiHand(e);

      if (e.targets != null) {
        for (final seat in e.targets!) {
          if (seat == 0) {
            onHostEvent?.call(e.event, e.data);
          } else {
            _sendTo(seat, e.event, e.data);
          }
        }
      } else {
        // Broadcast.
        onHostEvent?.call(e.event, e.data);
        for (int i = 1; i < 4; i++) {
          _sendTo(i, e.event, e.data);
        }
      }
    }
  }

  void _trackAiHand(GameEvent e) {
    if (e.event == 'game:start' && e.targets != null) {
      final seat = e.targets!.first;
      if (_isAiSeat(seat)) {
        final ids = List<int>.from((e.data as Map)['handTileIds'] as List);
        _aiHands[seat] = ids;
      }
    } else if (e.event == 'game:tile_drawn' && e.targets != null) {
      final seat = e.targets!.first;
      if (_isAiSeat(seat)) {
        final id = (e.data as Map)['tileId'] as int;
        (_aiHands[seat] ??= []).add(id);
      }
    } else if (e.event == 'game:tile_discarded') {
      final seat = (e.data as Map)['seatIndex'] as int;
      final id = (e.data as Map)['tileId'] as int;
      _aiHands[seat]?.remove(id);
    } else if (e.event == 'game:action_result') {
      final seat = (e.data as Map)['seatIndex'] as int;
      final tiles = List<int>.from((e.data as Map)['tiles'] as List? ?? []);
      if (_isAiSeat(seat)) {
        for (final id in tiles) {
          _aiHands[seat]?.remove(id);
        }
      }
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  void _sendTo(int seat, String event, dynamic data) {
    final ws = _seats[seat].socket;
    if (ws == null || ws.closeCode != null) return;
    try {
      ws.add(jsonEncode({'event': event, 'data': data}));
    } catch (_) {}
  }

  void _broadcastAll(String event, dynamic data) {
    onHostEvent?.call(event, data);
    for (int i = 1; i < 4; i++) {
      _sendTo(i, event, data);
    }
  }

  void _broadcastRoomState() {
    final state = _roomStateData();
    onHostEvent?.call('room:state', state);
    for (int i = 1; i < 4; i++) {
      _sendTo(i, 'room:state', state);
    }
    onRoomChanged?.call(_playerList(), _connected + 1);
  }

  Map<String, dynamic> _roomStateData() => {
        'roomId': roomId,
        'roomType': 'lan',
        'playerCount': _connected + 1,
        'players': _playerList(),
      };

  List<Map<String, dynamic>> _playerList() => List.generate(4, (i) => {
        'seatIndex': i,
        'nickname': _seats[i].nickname.isEmpty ? '空位' : _seats[i].nickname,
        'isReady': _seats[i].isReady,
        'isConnected': i == 0 || (_seats[i].socket?.closeCode == null && _seats[i].socket != null),
      });

  void _onClientDisconnect(int seat) {
    _seats[seat].socket = null;
    _seats[seat].isReady = false;
    _connected = (_connected - 1).clamp(0, 3);
    if (!_gameStarted) _broadcastRoomState();
  }

  Future<void> stop() async {
    _engine?.dispose();
    _discovery?.stop();
    for (final s in _seats) {
      await s.socket?.close();
    }
    await _http?.close(force: true);
  }
}
