import 'tile_model.dart';

class BirdResult {
  final List<int> birdTileIds;
  final List<int> birdSeats;
  final List<int> multipliers;
  BirdResult({required this.birdTileIds, required this.birdSeats, required this.multipliers});
}

class ScoreCalculator {
  static List<int> calculateScore({
    required List<int> winnerIndex,
    required List<String> winTypes,
    required bool isSelfDraw,
    required int dianPaoIndex,
    required int dealerIndex,
    int baseScore = 10,
  }) {
    final scores = [0, 0, 0, 0];
    final isBigWin = winTypes.isNotEmpty;
    final bigCount = winTypes.where((w) => bigWinTypes.contains(w)).length;
    const dealerBonus = 10;
    final smallBase = baseScore;
    final bigBase = baseScore * 3;

    for (final winner in winnerIndex) {
      final isDealer = winner == dealerIndex;
      final winBase = isBigWin ? bigBase * (bigCount > 1 ? bigCount : 1) : smallBase;

      if (isSelfDraw) {
        for (int i = 0; i < 4; i++) {
          if (i == winner) continue;
          int lose = winBase;
          if (i == dealerIndex || isDealer) lose += dealerBonus;
          scores[i] -= lose;
          scores[winner] += lose;
        }
      } else {
        int lose = winBase * 2;
        if (dianPaoIndex == dealerIndex || isDealer) lose += dealerBonus;
        scores[dianPaoIndex] -= lose;
        scores[winner] += lose;
      }
    }
    return scores;
  }

  static BirdResult calculateBirds(List<Tile> birdTiles, int dealerIndex) {
    final birdSeats = <int>[];
    final multipliers = [1, 1, 1, 1];
    for (final bird in birdTiles) {
      final offset = (bird.value - 1) % 4;
      final seat = (dealerIndex + offset) % 4;
      birdSeats.add(seat);
      multipliers[seat] *= 2;
    }
    return BirdResult(
      birdTileIds: birdTiles.map((t) => t.id).toList(),
      birdSeats: birdSeats,
      multipliers: multipliers,
    );
  }

  static List<int> applyBirdMultipliers(
    List<int> base,
    BirdResult bird,
    int winner,
    bool isSelfDraw,
    int dianPao,
  ) {
    final out = List<int>.from(base);
    if (isSelfDraw) {
      int sum = 0;
      for (int i = 0; i < 4; i++) {
        if (i == winner) continue;
        out[i] = base[i] * bird.multipliers[i];
        sum += out[i];
      }
      out[winner] = -sum;
    } else {
      out[dianPao] = base[dianPao] * bird.multipliers[dianPao];
      out[winner] = -out[dianPao];
      for (int i = 0; i < 4; i++) {
        if (i != winner && i != dianPao) {
          out[i] = base[i] * bird.multipliers[i];
        }
      }
    }
    return out;
  }
}
