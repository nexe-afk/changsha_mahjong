import { Tile, JIANG_VALUES } from '../../../../shared/constants';

export class AIPlayer {

  static chooseDiscard(hand: Tile[]): Tile {
    if (hand.length === 0) throw new Error('Empty hand');

    const scores = hand.map(tile => ({
      tile,
      score: AIPlayer.evaluateTileUsefulness(tile, hand),
    }));

    scores.sort((a, b) => a.score - b.score);
    return scores[0].tile;
  }

  private static evaluateTileUsefulness(tile: Tile, hand: Tile[]): number {
    let score = 0;
    const { suit, value } = tile;

    const sameCount = hand.filter(t => t.suit === suit && t.value === value).length;
    score += sameCount * 10;

    const hasAdjLeft = hand.some(t => t.suit === suit && t.value === value - 1);
    const hasAdjRight = hand.some(t => t.suit === suit && t.value === value + 1);
    if (hasAdjLeft) score += 5;
    if (hasAdjRight) score += 5;

    const hasNearLeft = hand.some(t => t.suit === suit && t.value === value - 2);
    const hasNearRight = hand.some(t => t.suit === suit && t.value === value + 2);
    if (hasNearLeft) score += 2;
    if (hasNearRight) score += 2;

    if (JIANG_VALUES.includes(value as any)) score += 3;

    score += (5 - Math.abs(value - 5));

    return score;
  }

  static shouldPong(hand: Tile[], discardedTile: Tile): boolean {
    const matching = hand.filter(t => t.suit === discardedTile.suit && t.value === discardedTile.value);
    return matching.length >= 2;
  }

  static shouldChow(hand: Tile[], discardedTile: Tile): boolean {
    return hand.some(t => t.suit === discardedTile.suit && Math.abs(t.value - discardedTile.value) <= 2);
  }

  static shouldKong(hand: Tile[], tile: Tile): boolean {
    const count = hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
    return count >= 3;
  }
}
