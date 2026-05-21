import 'tile_model.dart';

class ChowOption {
  final List<Tile> tiles;
  final String type; // 'left' | 'middle' | 'right'
  ChowOption({required this.tiles, required this.type});
}

class ActionValidator {
  static bool canChow(List<Tile> hand, Tile discarded) {
    return getChowOptions(hand, discarded).isNotEmpty;
  }

  static List<ChowOption> getChowOptions(List<Tile> hand, Tile discarded) {
    final options = <ChowOption>[];
    final suit = discarded.suit;
    final v = discarded.value;

    bool has(int val) => hand.any((t) => t.suit == suit && t.value == val);

    Tile pick(int val) => hand.firstWhere((t) => t.suit == suit && t.value == val);

    if (v >= 3 && has(v - 2) && has(v - 1)) {
      options.add(ChowOption(tiles: [pick(v - 2), pick(v - 1), discarded], type: 'left'));
    }
    if (v >= 2 && v <= 8 && has(v - 1) && has(v + 1)) {
      options.add(ChowOption(tiles: [pick(v - 1), pick(v + 1), discarded], type: 'middle'));
    }
    if (v <= 7 && has(v + 1) && has(v + 2)) {
      options.add(ChowOption(tiles: [pick(v + 1), pick(v + 2), discarded], type: 'right'));
    }
    return options;
  }

  static bool canPong(List<Tile> hand, Tile discarded) {
    return hand.where((t) => t.suit == discarded.suit && t.value == discarded.value).length >= 2;
  }

  static bool canMingKong(List<Tile> hand, Tile discarded) {
    return hand.where((t) => t.suit == discarded.suit && t.value == discarded.value).length >= 3;
  }
}
