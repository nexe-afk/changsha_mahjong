import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../services/game_state.dart';
import '../../widgets/tile/tile_widget.dart';

class ResultPage extends StatefulWidget {
  const ResultPage({super.key});
  @override
  State<ResultPage> createState() => _ResultPageState();
}

class _ResultPageState extends State<ResultPage> with TickerProviderStateMixin {
  late AnimationController _birdController;
  late AnimationController _scoreController;

  // 实际游戏数据
  List<int> _winnerIndex = [];
  List<String> _winTypes = [];
  bool _isSelfDraw = false;
  List<int> _scores = [0, 0, 0, 0];
  List<int> _birdTileIds = [];
  List<String> _birdLabels = [];
  List<int> _birdSeats = [];
  List<int> _multipliers = [1, 1, 1, 1];
  int _mySeatIndex = 0;
  int _dealerIndex = 0;
  bool _isDraw = false;

  // 牌型颜色
  static const _winTypeColors = {
    'QingYiSe': Color(0xFFFF6B35),
    'DuiDuiHu': Color(0xFFE74C3C),
    'JiangJiangHu': Color(0xFFE67E22),
    'QiXiaoDui': Color(0xFF9B59B6),
    'HaoQiXiaoDui': Color(0xFF8E44AD),
    'GangShangHua': Color(0xFF2ECC71),
    'QiangGangHu': Color(0xFF1ABC9C),
    'HaiDiLaoYue': Color(0xFF3498DB),
    'TianHu': Color(0xFFF1C40F),
    'DiHu': Color(0xFFE91E63),
  };

  static const _winTypeNames = {
    'QingYiSe': '清一色',
    'DuiDuiHu': '碰碰胡',
    'JiangJiangHu': '将将胡',
    'QiXiaoDui': '七小对',
    'HaoQiXiaoDui': '豪七小对',
    'GangShangHua': '杠上花',
    'QiangGangHu': '抢杠胡',
    'HaiDiLaoYue': '海底捞月',
    'TianHu': '天胡',
    'DiHu': '地胡',
  };

  bool _scoresShown = false;

  @override
  void initState() {
    super.initState();
    _birdController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _scoreController = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));

    // 读取实际数据
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args == null || args is! Map<String, dynamic>) return;
      try {
        setState(() {
          _mySeatIndex = (args['mySeatIndex'] as num?)?.toInt() ?? 0;
          _dealerIndex = (args['dealerIndex'] as num?)?.toInt() ?? 0;
          _winnerIndex = (args['winnerIndex'] as List?)
              ?.map((e) => (e as num).toInt())
              .toList() ?? [];
          _winTypes = (args['winTypes'] as List?)?.cast<String>() ?? [];
          _isSelfDraw = (args['isSelfDraw'] as bool?) ?? false;
          final rawScores = args['scores'];
          if (rawScores is List) {
            _scores = rawScores.map((e) => (e as num).toInt()).toList();
          }

          final birdData = args['birdData'];
          if (birdData is Map) {
            final bt = birdData['birdTiles'];
            if (bt is List) _birdTileIds = bt.map((e) => (e as num).toInt()).toList();
            final bs = birdData['birdSeats'];
            if (bs is List) _birdSeats = bs.map((e) => (e as num).toInt()).toList();
            final ml = birdData['multipliers'];
            if (ml is List) _multipliers = ml.map((e) => (e as num).toInt()).toList();
          }
          final bl = args['birdLabels'];
          if (bl is List) _birdLabels = bl.cast<String>().toList();
          _isDraw = _winnerIndex.isEmpty;
        });
      } catch (e, st) {
        debugPrint('ResultPage data parse error: $e\n$st');
      }
    });

    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) {
        _birdController.forward();
      }
    });

    Future.delayed(const Duration(milliseconds: 2000), () {
      if (mounted) {
        _scoreController.forward();
        setState(() => _scoresShown = true);
      }
    });
  }

  String _playerName(int seat) {
    const labels = ['你', '下家', '对家', '上家'];
    final rel = (seat - _mySeatIndex + 4) % 4;
    return labels[rel];
  }

  String _scoreStr(int score) {
    return score >= 0 ? '+$score' : '$score';
  }

  Color _scoreColor(int score) {
    return score > 0 ? AppTheme.gold : (score < 0 ? Colors.redAccent : Colors.white54);
  }

  int _tileSuit(int id) => (id ~/ 36).clamp(0, 2);
  int _tileValue(int id) => ((id % 36) ~/ 4).clamp(0, 8) + 1;
  bool _isRedTile(int id) {
    final val = _tileValue(id);
    final suit = _tileSuit(id);
    return val == 5 && (suit == 0 || suit == 2); // 五万、五筒为红
  }

  String _tileLabel(int id) {
    const cn = ['一','二','三','四','五','六','七','八','九'];
    final val = ((id % 36) ~/ 4).clamp(0, 8);
    final suit = (id ~/ 36).clamp(0, 2);
    final suitName = ['万','条','筒'][suit];
    return '${cn[val]}$suitName';
  }

  @override
  void dispose() {
    _birdController.dispose();
    _scoreController.dispose();
    super.dispose();
  }

  void _goToLobby() {
    appState.socket?.emit('room:leave');
    Navigator.pushReplacementNamed(context, '/lobby');
  }

  void _playAgain() {
    appState.socket?.emit('room:leave');
    appState.socket?.emit('room:joinAI', {});
    Navigator.pushReplacementNamed(context, '/game');
  }

  @override
  Widget build(BuildContext context) {
    final isWinner = _winnerIndex.contains(_mySeatIndex);
    final winnerName = _winnerIndex.isNotEmpty ? _playerName(_winnerIndex[0]) : '';

    return Scaffold(
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF1A3C34), Color(0xFF0D5E3A)],
            ),
          ),
          child: Column(
            children: [
              const SizedBox(height: 24),
              // 结果标题
              Text(
                _isDraw ? '流局' : (isWinner ? '恭喜胡牌！' : '$winnerName 胡牌'),
                style: const TextStyle(fontSize: 28, color: AppTheme.gold, fontWeight: FontWeight.bold),
              ),
              if (_isDraw) ...[
                const SizedBox(height: 8),
                const Text('荒牌平局', style: TextStyle(color: Colors.white54, fontSize: 16)),
              ] else ...[
                const SizedBox(height: 8),
                // 胡牌类型标签
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  alignment: WrapAlignment.center,
                  children: _winTypes.map((wt) {
                    final cnName = _winTypeNames[wt] ?? wt;
                    final color = _winTypeColors[wt] ?? AppTheme.gold;
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.25),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: color.withOpacity(0.5)),
                      ),
                      child: Text(cnName, style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.bold)),
                    );
                  }).toList(),
                ),
                if (_isSelfDraw) ...[
                  const SizedBox(height: 4),
                  const Text('自摸', style: TextStyle(color: Colors.white54, fontSize: 14)),
                ],
              ],
              const SizedBox(height: 24),
              // 扎鸟区域
              const Text('扎鸟', style: TextStyle(fontSize: 20, color: AppTheme.gold, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (_birdTileIds.isNotEmpty && _birdLabels.length >= _birdTileIds.length)
                _buildBirdDisplay()
              else
                const Text('未扎鸟', style: TextStyle(color: Colors.white38, fontSize: 14)),
              if (_birdSeats.isNotEmpty) ...[
                const SizedBox(height: 8),
                _buildBirdResultInfo(),
              ],
              const SizedBox(height: 24),
              // 分数结算
              if (_scoresShown) ...[
                const Text('分数结算', style: TextStyle(fontSize: 20, color: AppTheme.gold, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                _buildScoreTable(),
              ],
              const Spacer(),
              // 按钮
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                ElevatedButton(
                  onPressed: _goToLobby,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white12,
                    foregroundColor: Colors.white70,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  ),
                  child: const Text('返回大厅', style: TextStyle(fontSize: 16)),
                ),
                const SizedBox(width: 16),
                ElevatedButton.icon(
                  onPressed: _playAgain,
                  icon: const Icon(Icons.replay),
                  label: const Text('再来一局', style: TextStyle(fontSize: 16)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.gold,
                    foregroundColor: AppTheme.primaryGreen,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  ),
                ),
              ]),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBirdDisplay() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(_birdTileIds.length, (i) {
        final label = i < _birdLabels.length ? _birdLabels[i] : _tileLabel(_birdTileIds[i]);
        final isHit = i < _birdSeats.length && _winnerIndex.isNotEmpty && _birdSeats[i] == _winnerIndex[0];
        // 安全获取倍数
        final birdSeat = i < _birdSeats.length ? _birdSeats[i] : -1;
        final multiplier = (birdSeat >= 0 && birdSeat < _multipliers.length)
            ? _multipliers[birdSeat]
            : 1;
        return Padding(
          padding: EdgeInsets.only(left: i > 0 ? 12 : 0),
          child: Column(
            children: [
              _birdTileWidget(_birdTileIds[i], isHit),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  color: isHit ? AppTheme.gold : Colors.white54,
                  fontSize: 12,
                  fontWeight: isHit ? FontWeight.bold : FontWeight.normal,
                ),
              ),
              const SizedBox(height: 2),
              if (birdSeat >= 0) ...[
                Text(
                  _playerName(birdSeat),
                  style: TextStyle(
                    color: _winnerIndex.isNotEmpty && birdSeat == _winnerIndex[0] ? AppTheme.gold : Colors.white54,
                    fontSize: 11,
                  ),
                ),
                Text(
                  'x$multiplier',
                  style: const TextStyle(
                    color: AppTheme.gold,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ],
          ),
        );
      }),
    );
  }

  Widget _birdTileWidget(tileId, bool isHit) {
    final id = tileId is int ? tileId : 0;
    final suitNames = ['wan', 'tiao', 'tong'];
    final suitIdx = _tileSuit(id).clamp(0, 2);
    final suit = suitNames[suitIdx];
    final value = _tileValue(id).clamp(1, 9);
    final isRed = _isRedTile(id);

    return AnimatedBuilder(
      animation: _birdController,
      builder: (context, child) {
        if (_birdController.value < 0.5) {
          final angle = _birdController.value * math.pi;
          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.rotationY(angle),
            child: child,
          );
        } else {
          final angle = (1 - _birdController.value) * math.pi;
          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.rotationY(angle),
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(
                  color: isHit ? Colors.redAccent : const Color(0xFFC0B898),
                  width: isHit ? 3 : 1.5,
                ),
                borderRadius: BorderRadius.circular(6),
              ),
              child: TileWidget(
                suit: suit,
                value: value,
                isRedTile: isRed,
                width: 56,
                height: 72,
              ),
            ),
          );
        }
      },
      child: Container(
        width: 56, height: 72,
        decoration: BoxDecoration(
          color: const Color(0xFF1B5E20),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: const Color(0xFF2E7D32), width: 2),
        ),
        child: Center(
          child: Icon(Icons.grid_on_rounded, color: const Color(0xFF236B28), size: 24),
        ),
      ),
    );
  }

  Widget _buildBirdResultInfo() {
    // 统计中鸟信息
    final winnerIdx = _winnerIndex.isNotEmpty ? _winnerIndex[0] : -1;
    if (winnerIdx < 0) return const SizedBox.shrink();
    final hitCount = _birdSeats.where((s) => s == winnerIdx).length;
    final totalMultiplier = (winnerIdx >= 0 && winnerIdx < _multipliers.length)
        ? _multipliers[winnerIdx]
        : 1;

    String comboText;
    Color comboColor;
    if (hitCount >= _birdTileIds.length) {
      comboText = '🎯 双鸟全中！x$totalMultiplier';
      comboColor = Colors.redAccent;
    } else if (hitCount > 0) {
      comboText = '✅ 中 $hitCount 鸟！x$totalMultiplier';
      comboColor = AppTheme.gold;
    } else {
      comboText = '❌ 未中鸟';
      comboColor = Colors.white54;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: comboColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(comboText, style: TextStyle(color: comboColor, fontSize: 15, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildScoreTable() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        children: List.generate(4, (i) {
          final score = i < _scores.length ? _scores[i] : 0;
          final isDealer = i == _dealerIndex;
          final isWinnerPlayer = _winnerIndex.contains(i);
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            margin: const EdgeInsets.symmetric(vertical: 3),
            decoration: BoxDecoration(
              color: isWinnerPlayer ? Colors.amber.withOpacity(0.15) : Colors.black26,
              borderRadius: BorderRadius.circular(8),
              border: isDealer ? Border.all(color: AppTheme.gold.withOpacity(0.3)) : null,
            ),
            child: Row(
              children: [
                Icon(
                  isWinnerPlayer ? Icons.emoji_events : Icons.person,
                  color: isWinnerPlayer ? AppTheme.gold : Colors.white38,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${_playerName(i)}${isDealer ? ' (庄)' : ''}',
                    style: TextStyle(
                      color: isWinnerPlayer ? AppTheme.gold : Colors.white,
                      fontSize: 15,
                    ),
                  ),
                ),
                Text(
                  _scoreStr(score),
                  style: TextStyle(
                    color: _scoreColor(score),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }
}
