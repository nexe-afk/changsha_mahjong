import { AIPlayer } from '../ai-player';
import { Tile, Suit } from '../../../../../shared/constants';

function tile(suit: Suit, value: number, id: number): Tile {
  return { suit, value: value as any, id };
}

describe('AIPlayer', () => {
  it('should choose a tile to discard', () => {
    const hand = [
      tile(Suit.Wan, 1, 0), tile(Suit.Wan, 2, 1), tile(Suit.Wan, 3, 2),
      tile(Suit.Wan, 5, 3), tile(Suit.Tiao, 1, 4), tile(Suit.Tiao, 9, 5),
      tile(Suit.Tong, 1, 6), tile(Suit.Tong, 5, 7), tile(Suit.Tong, 8, 8),
    ];
    const discard = AIPlayer.chooseDiscard(hand);
    expect(discard).toBeDefined();
    expect(hand.some(t => t.id === discard.id)).toBe(true);
  });

  it('should prefer discarding isolated tiles', () => {
    const hand = [
      tile(Suit.Wan, 1, 0), tile(Suit.Wan, 2, 1), tile(Suit.Wan, 3, 2),
      tile(Suit.Tiao, 1, 3), tile(Suit.Tiao, 1, 4),
      tile(Suit.Tong, 9, 5),
    ];
    const discard = AIPlayer.chooseDiscard(hand);
    expect(discard.value).toBe(9);
  });

  it('should decide to pong or pass', () => {
    const hand = [tile(Suit.Wan, 5, 0), tile(Suit.Wan, 5, 1)];
    expect(AIPlayer.shouldPong(hand, tile(Suit.Wan, 5, 10))).toBe(true);
  });
});
