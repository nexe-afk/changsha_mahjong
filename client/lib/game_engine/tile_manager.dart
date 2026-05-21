import 'dart:math';
import 'tile_model.dart';

class TileManager {
  final List<Tile> _wall = [];

  TileManager() {
    final deck = createFullDeck();
    _shuffle(deck);
    _wall.addAll(deck);
  }

  int get wallRemaining => _wall.length;

  // Deals 13 tiles to each player (dealer gets 14). Starts dealing from dealer.
  List<List<Tile>> deal(int dealerIndex) {
    final hands = List.generate(4, (_) => <Tile>[]);
    // 3 rounds of 4 tiles each
    for (int round = 0; round < 3; round++) {
      for (int seat = 0; seat < 4; seat++) {
        final p = (dealerIndex + seat) % 4;
        for (int i = 0; i < 4; i++) {
          hands[p].add(_wall.removeAt(0));
        }
      }
    }
    // One extra tile each
    for (int seat = 0; seat < 4; seat++) {
      final p = (dealerIndex + seat) % 4;
      hands[p].add(_wall.removeAt(0));
    }
    // Dealer's 14th tile
    hands[dealerIndex].add(_wall.removeAt(0));
    return hands;
  }

  Tile? drawFromWall() {
    if (_wall.isEmpty) return null;
    return _wall.removeAt(0);
  }

  Tile? drawFromEnd() {
    if (_wall.isEmpty) return null;
    return _wall.removeLast();
  }

  void _shuffle(List<Tile> tiles) {
    final rand = Random();
    for (int i = tiles.length - 1; i > 0; i--) {
      final j = rand.nextInt(i + 1);
      final tmp = tiles[i];
      tiles[i] = tiles[j];
      tiles[j] = tmp;
    }
  }
}
