import 'tile_model.dart';

class WinCheckResult {
  final bool canWin;
  final int? jiangValue;
  WinCheckResult({required this.canWin, this.jiangValue});
}

class WinAnalysis {
  final List<String> winTypes;
  final bool isBigWin;
  WinAnalysis({required this.winTypes, required this.isBigWin});
}

class WinDetector {
  // wildJiang=false → pair must be 2/5/8; wildJiang=true → any pair
  static WinCheckResult checkBasicWin(List<Tile> hand, bool wildJiang) {
    if (hand.length != 14) return WinCheckResult(canWin: false);
    for (int i = 0; i < hand.length; i++) {
      for (int j = i + 1; j < hand.length; j++) {
        if (hand[i].suit == hand[j].suit && hand[i].value == hand[j].value) {
          final pv = hand[i].value;
          if (!wildJiang && !jiangValues.contains(pv)) continue;
          final rem = <Tile>[];
          for (int k = 0; k < hand.length; k++) {
            if (k != i && k != j) rem.add(hand[k]);
          }
          if (_canFormMelds(rem)) return WinCheckResult(canWin: true, jiangValue: pv);
        }
      }
    }
    return WinCheckResult(canWin: false);
  }

  static bool _canFormMelds(List<Tile> tiles) {
    if (tiles.isEmpty) return true;
    if (tiles.length % 3 != 0) return false;
    final sorted = List<Tile>.from(tiles)
      ..sort((a, b) {
        if (a.suit != b.suit) return a.suit.compareTo(b.suit);
        return a.value.compareTo(b.value);
      });
    return _tryFormMelds(sorted);
  }

  static bool _tryFormMelds(List<Tile> sorted) {
    if (sorted.isEmpty) return true;
    final first = sorted[0];

    // Try triplet (刻子): sorted[0,1,2] must match
    if (sorted.length >= 3 &&
        sorted[1].suit == first.suit && sorted[1].value == first.value &&
        sorted[2].suit == first.suit && sorted[2].value == first.value) {
      if (_tryFormMelds(sorted.sublist(3))) return true;
    }

    // Try sequence (顺子): find first.value+1 and first.value+2 in same suit
    final midIdx = sorted.indexWhere(
      (t) => t.suit == first.suit && t.value == first.value + 1, 1);
    final endIdx = sorted.indexWhere(
      (t) => t.suit == first.suit && t.value == first.value + 2, 1);

    if (midIdx != -1 && endIdx != -1) {
      final rest = <Tile>[];
      for (int i = 0; i < sorted.length; i++) {
        if (i != 0 && i != midIdx && i != endIdx) rest.add(sorted[i]);
      }
      if (_tryFormMelds(rest)) return true;
    }

    return false;
  }

  static bool isQiXiaoDui(List<Tile> hand) {
    if (hand.length != 14) return false;
    final counts = <String, int>{};
    for (final t in hand) {
      counts['${t.suit}-${t.value}'] = (counts['${t.suit}-${t.value}'] ?? 0) + 1;
    }
    if (counts.length != 7) return false;
    return counts.values.every((c) => c == 2);
  }

  static bool isPengPengHu(List<Tile> hand, List<Tile> meldTiles) {
    final all = [...hand, ...meldTiles];
    final counts = <String, int>{};
    for (final t in all) {
      counts['${t.suit}-${t.value}'] = (counts['${t.suit}-${t.value}'] ?? 0) + 1;
    }
    int pairs = 0, triplets = 0;
    for (final c in counts.values) {
      if (c == 2) {
        pairs++;
      } else if (c == 3) {
        triplets++;
      } else if (c == 4) {
        triplets++;
        pairs++;
      } else {
        return false;
      }
    }
    final totalMelds = meldTiles.length ~/ 3;
    return pairs == 1 && triplets == 4 - totalMelds;
  }

  static bool isQingYiSe(List<Tile> hand, List<Tile> meldTiles) {
    final all = [...hand, ...meldTiles];
    if (all.isEmpty) return false;
    final firstSuit = all[0].suit;
    return all.every((t) => t.suit == firstSuit);
  }

  static bool isJiangJiangHu(List<Tile> hand, List<Tile> meldTiles) {
    return [...hand, ...meldTiles].every((t) => jiangValues.contains(t.value));
  }

  static WinAnalysis analyzeWin(
    List<Tile> hand,
    bool isDealer,
    bool isFirstTurn,
    bool isSelfDraw, {
    required bool isAfterKong,
    required bool isSeaBottom,
    required bool isRobKong,
    required List<Map<String, dynamic>> melds,
  }) {
    final winTypes = <String>[];
    final meldTiles = melds.expand((m) => m['tiles'] as List<Tile>).toList();

    if (isDealer && isFirstTurn && isSelfDraw) winTypes.add('tian_hu');
    if (!isDealer && isFirstTurn && !isSelfDraw) winTypes.add('di_hu');
    if (isPengPengHu(hand, meldTiles)) winTypes.add('peng_peng_hu');
    if (isJiangJiangHu(hand, meldTiles)) winTypes.add('jiang_jiang_hu');
    if (isQingYiSe(hand, meldTiles)) winTypes.add('qing_yi_se');
    if (meldTiles.isEmpty && isQiXiaoDui(hand)) winTypes.add('qi_xiao_dui');
    if (melds.length == 4 && hand.length == 1) winTypes.add('quan_qiu_ren');
    if (isSeaBottom && isSelfDraw) winTypes.add('hai_di_lao_yue');
    if (isAfterKong && isSelfDraw) winTypes.add('gang_shang_kai_hua');
    if (isAfterKong && !isSelfDraw) winTypes.add('gang_shang_pao');
    if (isRobKong) winTypes.add('qiang_gang_hu');

    return WinAnalysis(winTypes: winTypes, isBigWin: winTypes.isNotEmpty);
  }

  static List<String> checkInitialWins(List<Tile> hand) {
    final wins = <String>[];
    final counts = <String, int>{};
    for (final t in hand) {
      counts['${t.suit}-${t.value}'] = (counts['${t.suit}-${t.value}'] ?? 0) + 1;
    }
    if (counts.values.any((c) => c == 4)) wins.add('si_xi');
    if (!hand.any((t) => jiangValues.contains(t.value))) wins.add('ban_ban_hu');

    final hasWan = hand.any((t) => t.suit == 'wan');
    final hasTiao = hand.any((t) => t.suit == 'tiao');
    final hasTong = hand.any((t) => t.suit == 'tong');
    final missing = (!hasWan ? 1 : 0) + (!hasTiao ? 1 : 0) + (!hasTong ? 1 : 0);
    if (missing == 1) wins.add('que_yi_se');

    final triplets = counts.values.where((c) => c >= 3).length;
    if (triplets >= 2) wins.add('liu_liu_shun');

    return wins;
  }
}
