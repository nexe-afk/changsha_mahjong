const jiangValues = [2, 5, 8];

const bigWinTypes = [
  'tian_hu', 'di_hu', 'peng_peng_hu', 'jiang_jiang_hu',
  'qing_yi_se', 'qi_xiao_dui', 'quan_qiu_ren',
  'hai_di_lao_yue', 'gang_shang_kai_hua', 'gang_shang_pao', 'qiang_gang_hu',
];

class Tile {
  final String suit; // 'wan' | 'tiao' | 'tong'
  final int value;   // 1–9
  final int id;      // 0–107

  const Tile({required this.suit, required this.value, required this.id});

  @override
  bool operator ==(Object other) => other is Tile && other.id == id;

  @override
  int get hashCode => id;

  @override
  String toString() => '$suit-$value($id)';
}

List<Tile> createFullDeck() {
  final tiles = <Tile>[];
  int id = 0;
  for (final suit in ['wan', 'tiao', 'tong']) {
    for (int value = 1; value <= 9; value++) {
      for (int copy = 0; copy < 4; copy++) {
        tiles.add(Tile(suit: suit, value: value, id: id++));
      }
    }
  }
  return tiles;
}
