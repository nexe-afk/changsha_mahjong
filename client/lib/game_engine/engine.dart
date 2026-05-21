import 'dart:async';
import 'tile_model.dart';
import 'tile_manager.dart';
import 'action_validator.dart';
import 'win_detector.dart';
import 'score_calculator.dart';

class PlayerState {
  final int seatIndex;
  List<Tile> hand = [];
  List<Map<String, dynamic>> melds = []; // {'type': String, 'tiles': List<Tile>}
  List<Tile> discards = [];

  PlayerState(this.seatIndex);
}

class GameEvent {
  final String event;
  final dynamic data;
  final List<int>? targets; // null = broadcast to all

  GameEvent(this.event, this.data, {this.targets});
}

class GameEngine {
  final TileManager _tiles;
  final List<PlayerState> _players;
  final int _dealerIndex;

  int _currentTurn = -1;
  int _turnCount = 0;
  Tile? _lastDiscarded;
  int _lastDiscardSeat = -1;
  bool _isAfterKong = false;
  bool _isSeaBottom = false;

  final List<GameEvent> _queue = [];
  final Set<int> _pendingSeats = {};
  Timer? _actionTimer;

  // Called by the server when the action-timeout fires internally.
  void Function(List<GameEvent>)? onEvents;

  GameEngine({required int dealerIndex})
      : _dealerIndex = dealerIndex,
        _tiles = TileManager(),
        _players = List.generate(4, (i) => PlayerState(i));

  // ── public API ────────────────────────────────────────────────────────────

  List<GameEvent> start() {
    _queue.clear();
    final hands = _tiles.deal(_dealerIndex);

    for (int i = 0; i < 4; i++) {
      _players[i].hand = hands[i];
      _emit('game:start', {
        'handTileIds': hands[i].map((t) => t.id).toList(),
        'dealerIndex': _dealerIndex,
        'yourSeatIndex': i,
        'wallRemaining': _tiles.wallRemaining,
      }, targets: [i]);
    }

    _checkInitialWins();

    _currentTurn = _dealerIndex;
    _emit('game:turn', {'seatIndex': _dealerIndex, 'timeout': 30000});

    return _flush();
  }

  List<GameEvent> discard(int seat, int tileId) {
    _queue.clear();
    final player = _players[seat];
    final idx = player.hand.indexWhere((t) => t.id == tileId);
    if (idx == -1) {
      _emit('error', {'message': 'Tile not in hand'}, targets: [seat]);
      return _flush();
    }

    final tile = player.hand.removeAt(idx);
    player.discards.add(tile);
    _lastDiscarded = tile;
    _lastDiscardSeat = seat;

    _emit('game:tile_discarded', {'seatIndex': seat, 'tileId': tile.id});

    _isSeaBottom = _tiles.wallRemaining == 0;
    if (_isSeaBottom) {
      final nextSeat = (seat + 1) % 4;
      for (int i = 0; i < 4; i++) {
        _emit('game:sea_roaming', {
          'currentSeatIndex': nextSeat,
          'tileId': tile.id,
          'isYourTurn': i == nextSeat,
        }, targets: [i]);
      }
    }

    _checkActionsForDiscard(tile, seat);
    return _flush();
  }

  List<GameEvent> pong(int seat) {
    _queue.clear();
    _clearPending();
    if (_lastDiscarded == null) return _flush();

    final player = _players[seat];
    final tile = _lastDiscarded!;
    final matching = player.hand.where((t) => t.suit == tile.suit && t.value == tile.value).take(2).toList();
    if (matching.length < 2) {
      _emit('error', {'message': 'Cannot pong'}, targets: [seat]);
      return _flush();
    }

    final pongTiles = [tile, matching[0], matching[1]];
    player.hand.remove(matching[0]);
    player.hand.remove(matching[1]);
    player.melds.add({'type': 'pong', 'tiles': pongTiles});
    _players[_lastDiscardSeat].discards.removeLast();

    _emit('game:action_result', {
      'seatIndex': seat,
      'action': 'pong',
      'tiles': pongTiles.map((t) => t.id).toList(),
      'fromSeat': _lastDiscardSeat,
    });

    _isAfterKong = false;
    _lastDiscarded = null;
    _currentTurn = seat;
    _emit('game:turn', {'seatIndex': seat, 'timeout': 30000});
    return _flush();
  }

  List<GameEvent> kong(int seat, int tileId, String kongType) {
    _queue.clear();
    _clearPending();

    if (kongType == 'ang') {
      final player = _players[seat];
      final ref = player.hand.firstWhere((t) => t.id == tileId, orElse: () => const Tile(suit: '', value: 0, id: -1));
      if (ref.id == -1) {
        _emit('error', {'message': 'Tile not found'}, targets: [seat]);
        return _flush();
      }
      final quads = player.hand.where((t) => t.suit == ref.suit && t.value == ref.value).toList();
      if (quads.length < 4) {
        _emit('error', {'message': 'Cannot ang kong'}, targets: [seat]);
        return _flush();
      }
      player.hand.removeWhere((t) => t.suit == ref.suit && t.value == ref.value);
      player.melds.add({'type': 'ang_kong', 'tiles': quads});
      _emit('game:action_result', {
        'seatIndex': seat,
        'action': 'kong',
        'tiles': quads.map((t) => t.id).toList(),
        'fromSeat': -1,
      });
    } else {
      if (_lastDiscarded == null) return _flush();
      final player = _players[seat];
      final tile = _lastDiscarded!;
      final matching = player.hand.where((t) => t.suit == tile.suit && t.value == tile.value).take(3).toList();
      if (matching.length < 3) {
        _emit('error', {'message': 'Cannot ming kong'}, targets: [seat]);
        return _flush();
      }
      final kongTiles = [tile, ...matching];
      for (final t in matching) {
        player.hand.remove(t);
      }
      player.melds.add({'type': 'ming_kong', 'tiles': kongTiles});
      _players[_lastDiscardSeat].discards.removeLast();
      _emit('game:action_result', {
        'seatIndex': seat,
        'action': 'kong',
        'tiles': kongTiles.map((t) => t.id).toList(),
        'fromSeat': _lastDiscardSeat,
      });
    }

    _isAfterKong = true;
    _lastDiscarded = null;

    final drawn = _tiles.drawFromWall();
    if (drawn == null) {
      _endGameDraw();
      return _flush();
    }
    _players[seat].hand.add(drawn);
    _emit('game:tile_drawn', {'tileId': drawn.id}, targets: [seat]);
    _emit('game:tile_drawn_other', {'seatIndex': seat});

    _currentTurn = seat;
    _emit('game:turn', {'seatIndex': seat, 'timeout': 30000});
    return _flush();
  }

  List<GameEvent> chow(int seat, List<int> tileIds) {
    _queue.clear();
    _clearPending();
    if (_lastDiscarded == null) return _flush();

    final player = _players[seat];
    final discarded = _lastDiscarded!;
    final handTiles = tileIds
        .map((id) => player.hand.firstWhere((t) => t.id == id, orElse: () => const Tile(suit: '', value: 0, id: -1)))
        .where((t) => t.id != -1)
        .toList();

    if (handTiles.length < 2) {
      _emit('error', {'message': 'Cannot chow'}, targets: [seat]);
      return _flush();
    }

    final chowTiles = [...handTiles, discarded];
    for (final t in handTiles) {
      player.hand.remove(t);
    }
    player.melds.add({'type': 'chow', 'tiles': chowTiles});
    _players[_lastDiscardSeat].discards.removeLast();

    _emit('game:action_result', {
      'seatIndex': seat,
      'action': 'chow',
      'tiles': chowTiles.map((t) => t.id).toList(),
      'fromSeat': _lastDiscardSeat,
    });

    _isAfterKong = false;
    _lastDiscarded = null;
    _currentTurn = seat;
    _emit('game:turn', {'seatIndex': seat, 'timeout': 30000});
    return _flush();
  }

  List<GameEvent> win(int seat) {
    _queue.clear();
    _clearPending();

    final player = _players[seat];
    final hand = player.hand;
    final isSelfDraw = _lastDiscarded == null;
    final meldTiles = player.melds.expand((m) => m['tiles'] as List<Tile>).toList();

    final canBasic = WinDetector.checkBasicWin(hand, true).canWin;
    final isQXD = meldTiles.isEmpty && WinDetector.isQiXiaoDui(hand);
    final isPP = WinDetector.isPengPengHu(hand, meldTiles);
    final isJJ = WinDetector.isJiangJiangHu(hand, meldTiles);

    if (!canBasic && !isQXD && !isPP && !isJJ) {
      _emit('error', {'message': '当前手牌不满足胡牌条件'}, targets: [seat]);
      return _flush();
    }

    final analysis = WinDetector.analyzeWin(
      hand, seat == _dealerIndex, _turnCount == 0, isSelfDraw,
      isAfterKong: _isAfterKong, isSeaBottom: _isSeaBottom, isRobKong: false,
      melds: player.melds,
    );

    final birdTiles = <Tile>[];
    for (int i = 0; i < 2; i++) {
      final b = _tiles.drawFromEnd();
      if (b != null) birdTiles.add(b);
    }
    final birdResult = ScoreCalculator.calculateBirds(birdTiles, _dealerIndex);

    _emit('game:bird_reveal', {
      'birdTiles': birdResult.birdTileIds,
      'birdSeats': birdResult.birdSeats,
      'multipliers': birdResult.multipliers,
    });

    final base = ScoreCalculator.calculateScore(
      winnerIndex: [seat],
      winTypes: analysis.winTypes,
      isSelfDraw: isSelfDraw,
      dianPaoIndex: _lastDiscardSeat,
      dealerIndex: _dealerIndex,
    );
    final finalScores = ScoreCalculator.applyBirdMultipliers(
      base, birdResult, seat, isSelfDraw, _lastDiscardSeat,
    );

    _emit('game:result', {
      'winnerIndex': [seat],
      'winTypes': analysis.winTypes,
      'isSelfDraw': isSelfDraw,
      'dianPaoIndex': _lastDiscardSeat,
      'scores': finalScores,
      'handTiles': _players.map((p) => p.hand.map((t) => t.id).toList()).toList(),
      'melds': _players.map((p) => p.melds.map((m) => {
        'type': m['type'],
        'tiles': (m['tiles'] as List<Tile>).map((t) => t.id).toList(),
      }).toList()).toList(),
    });

    _emit('game:final_scores', {
      'scoreChanges': finalScores,
      'coinChanges': finalScores,
      'dealerIndex': seat,
    });

    return _flush();
  }

  List<GameEvent> pass(int seat) {
    _queue.clear();
    if (!_pendingSeats.contains(seat)) return _flush();

    _pendingSeats.remove(seat);
    if (_pendingSeats.isEmpty) {
      _actionTimer?.cancel();
      _actionTimer = null;
      _lastDiscarded = null;
      _advanceToNextPlayer();
    }
    return _flush();
  }

  void dispose() {
    _actionTimer?.cancel();
  }

  // ── private ───────────────────────────────────────────────────────────────

  void _checkInitialWins() {
    for (int i = 0; i < 4; i++) {
      final wins = WinDetector.checkInitialWins(_players[i].hand);
      if (wins.isNotEmpty) {
        _emit('game:initial_win', {
          'wins': [{'seatIndex': i, 'type': wins}],
        });
      }
    }
  }

  void _checkActionsForDiscard(Tile tile, int fromSeat) {
    _pendingSeats.clear();
    _actionTimer?.cancel();
    _actionTimer = null;

    bool hasAction = false;

    for (int i = 0; i < 4; i++) {
      if (i == fromSeat) continue;
      final actions = <Map<String, dynamic>>[];

      final testHand = [..._players[i].hand, tile];
      final meldTiles = _players[i].melds.expand((m) => m['tiles'] as List<Tile>).toList();

      final canWin = WinDetector.checkBasicWin(testHand, false).canWin ||
          WinDetector.checkBasicWin(testHand, true).canWin ||
          (meldTiles.isEmpty && WinDetector.isQiXiaoDui(testHand)) ||
          WinDetector.isPengPengHu(testHand, meldTiles) ||
          WinDetector.isJiangJiangHu(testHand, meldTiles);

      if (canWin) actions.add({'type': 'win'});

      if (ActionValidator.canPong(_players[i].hand, tile)) {
        actions.add({'type': 'pong'});
        if (ActionValidator.canMingKong(_players[i].hand, tile)) {
          actions.add({'type': 'kong', 'kongType': 'ming'});
        }
      }

      if (_isNextPlayer(i, fromSeat) && ActionValidator.canChow(_players[i].hand, tile)) {
        final opts = ActionValidator.getChowOptions(_players[i].hand, tile);
        actions.add({
          'type': 'chow',
          'options': opts.map((o) => {
            'tiles': o.tiles,
            'type': o.type,
          }).toList(),
        });
      }

      if (actions.isNotEmpty) {
        hasAction = true;
        _pendingSeats.add(i);
        _emit('game:action_prompt', {'actions': actions, 'timeout': 15000}, targets: [i]);
      }
    }

    if (!hasAction) {
      _advanceToNextPlayer();
    } else {
      _actionTimer = Timer(const Duration(seconds: 15), () {
        _queue.clear();
        _pendingSeats.clear();
        _lastDiscarded = null;
        _advanceToNextPlayer();
        onEvents?.call(_flush());
      });
    }
  }

  void _advanceToNextPlayer() {
    _currentTurn = (_currentTurn + 1) % 4;
    _turnCount++;

    final drawn = _tiles.drawFromWall();
    if (drawn == null) {
      _endGameDraw();
      return;
    }

    _players[_currentTurn].hand.add(drawn);
    _isSeaBottom = _tiles.wallRemaining == 0;
    _lastDiscarded = null;

    _emit('game:tile_drawn', {'tileId': drawn.id}, targets: [_currentTurn]);
    _emit('game:tile_drawn_other', {'seatIndex': _currentTurn});
    _emit('game:turn', {'seatIndex': _currentTurn, 'timeout': 30000});

    final player = _players[_currentTurn];
    final meldTiles = player.melds.expand((m) => m['tiles'] as List<Tile>).toList();
    final canSelfWin = WinDetector.checkBasicWin(player.hand, false).canWin ||
        WinDetector.checkBasicWin(player.hand, true).canWin ||
        (meldTiles.isEmpty && WinDetector.isQiXiaoDui(player.hand)) ||
        WinDetector.isPengPengHu(player.hand, meldTiles) ||
        WinDetector.isJiangJiangHu(player.hand, meldTiles);

    if (canSelfWin) {
      _emit('game:action_prompt', {
        'actions': [{'type': 'win'}],
        'timeout': 30000,
      }, targets: [_currentTurn]);
    }

    _isAfterKong = false;
  }

  void _endGameDraw() {
    _emit('game:result', {
      'winnerIndex': <int>[],
      'winTypes': <String>[],
      'isSelfDraw': false,
      'dianPaoIndex': -1,
      'scores': [0, 0, 0, 0],
      'handTiles': _players.map((p) => p.hand.map((t) => t.id).toList()).toList(),
      'melds': _players.map((p) => p.melds.map((m) => {
        'type': m['type'],
        'tiles': (m['tiles'] as List<Tile>).map((t) => t.id).toList(),
      }).toList()).toList(),
    });
  }

  bool _isNextPlayer(int seat, int fromSeat) => seat == (fromSeat + 1) % 4;

  void _emit(String event, dynamic data, {List<int>? targets}) {
    _queue.add(GameEvent(event, data, targets: targets));
  }

  List<GameEvent> _flush() {
    final out = List<GameEvent>.from(_queue);
    _queue.clear();
    return out;
  }

  void _clearPending() {
    _pendingSeats.clear();
    _actionTimer?.cancel();
    _actionTimer = null;
  }
}
