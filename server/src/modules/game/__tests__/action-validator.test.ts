import { ActionValidator } from '../action-validator';
import { Tile, Suit } from '../../../../../shared/constants';

function tile(suit: Suit, value: number, id: number): Tile {
  return { suit, value: value as any, id };
}

describe('ActionValidator', () => {
  describe('canChow', () => {
    it('should allow chow when hand has consecutive tiles', () => {
      const hand = [tile(Suit.Wan, 4, 10), tile(Suit.Wan, 5, 11)];
      const discarded = tile(Suit.Wan, 3, 0);
      expect(ActionValidator.canChow(hand, discarded)).toBe(true);
    });

    it('should reject chow across suits', () => {
      const hand = [tile(Suit.Tiao, 4, 10), tile(Suit.Tiao, 5, 11)];
      const discarded = tile(Suit.Wan, 3, 0);
      expect(ActionValidator.canChow(hand, discarded)).toBe(false);
    });

    it('should return chow options', () => {
      const hand = [tile(Suit.Wan, 2, 10), tile(Suit.Wan, 4, 11)];
      const discarded = tile(Suit.Wan, 3, 0);
      const options = ActionValidator.getChowOptions(hand, discarded);
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe('canPong', () => {
    it('should allow pong when hand has two matching tiles', () => {
      const hand = [tile(Suit.Wan, 3, 10), tile(Suit.Wan, 3, 11)];
      const discarded = tile(Suit.Wan, 3, 0);
      expect(ActionValidator.canPong(hand, discarded)).toBe(true);
    });

    it('should reject pong without matching tiles', () => {
      const hand = [tile(Suit.Wan, 3, 10), tile(Suit.Wan, 4, 11)];
      const discarded = tile(Suit.Wan, 5, 0);
      expect(ActionValidator.canPong(hand, discarded)).toBe(false);
    });
  });

  describe('canKong', () => {
    it('should detect ming kong', () => {
      const hand = [tile(Suit.Wan, 5, 10), tile(Suit.Wan, 5, 11), tile(Suit.Wan, 5, 12)];
      const discarded = tile(Suit.Wan, 5, 0);
      expect(ActionValidator.canMingKong(hand, discarded)).toBe(true);
    });

    it('should detect ang kong', () => {
      const hand = [
        tile(Suit.Wan, 5, 10), tile(Suit.Wan, 5, 11),
        tile(Suit.Wan, 5, 12), tile(Suit.Wan, 5, 13),
      ];
      expect(ActionValidator.canAngKong(hand)).toContainEqual(
        expect.objectContaining({ suit: Suit.Wan, value: 5 })
      );
    });
  });
});
