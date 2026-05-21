import { WinDetector } from '../win-detector';
import { Tile, Suit, TileValue } from '../../../../../shared/constants';

function tile(suit: Suit, value: TileValue, id: number): Tile {
  return { suit, value, id };
}

describe('WinDetector', () => {
  describe('basic win check (4 melds + 1 pair)', () => {
    it('should detect win with sequences and 2/5/8 jiang', () => {
      const hand: Tile[] = [
        tile(Suit.Wan, 1, 0), tile(Suit.Wan, 2, 1), tile(Suit.Wan, 3, 2),
        tile(Suit.Wan, 4, 3), tile(Suit.Wan, 5, 4), tile(Suit.Wan, 6, 5),
        tile(Suit.Wan, 7, 6), tile(Suit.Wan, 8, 7), tile(Suit.Wan, 9, 8),
        tile(Suit.Tiao, 1, 9), tile(Suit.Tiao, 2, 10), tile(Suit.Tiao, 3, 11),
        tile(Suit.Tong, 5, 12), tile(Suit.Tong, 5, 13),
      ];
      const result = WinDetector.checkBasicWin(hand);
      expect(result.canWin).toBe(true);
      expect(result.jiangValue).toBe(5);
    });

    it('should reject win with non-2-5-8 jiang for small win', () => {
      const hand: Tile[] = [
        tile(Suit.Wan, 1, 0), tile(Suit.Wan, 2, 1), tile(Suit.Wan, 3, 2),
        tile(Suit.Wan, 4, 3), tile(Suit.Wan, 5, 4), tile(Suit.Wan, 6, 5),
        tile(Suit.Wan, 7, 6), tile(Suit.Wan, 8, 7), tile(Suit.Wan, 9, 8),
        tile(Suit.Tiao, 1, 9), tile(Suit.Tiao, 2, 10), tile(Suit.Tiao, 3, 11),
        tile(Suit.Tong, 3, 12), tile(Suit.Tong, 3, 13),
      ];
      const result = WinDetector.checkBasicWin(hand, false);
      expect(result.canWin).toBe(false);
    });

    it('should accept non-2-5-8 jiang when wildJiang=true', () => {
      const hand: Tile[] = [
        tile(Suit.Wan, 1, 0), tile(Suit.Wan, 2, 1), tile(Suit.Wan, 3, 2),
        tile(Suit.Wan, 4, 3), tile(Suit.Wan, 5, 4), tile(Suit.Wan, 6, 5),
        tile(Suit.Wan, 7, 6), tile(Suit.Wan, 8, 7), tile(Suit.Wan, 9, 8),
        tile(Suit.Tiao, 1, 9), tile(Suit.Tiao, 2, 10), tile(Suit.Tiao, 3, 11),
        tile(Suit.Tong, 3, 12), tile(Suit.Tong, 3, 13),
      ];
      const result = WinDetector.checkBasicWin(hand, true);
      expect(result.canWin).toBe(true);
    });
  });

  describe('七小对', () => {
    it('should detect qi xiao dui', () => {
      const hand: Tile[] = [
        tile(Suit.Wan, 1, 0), tile(Suit.Wan, 1, 1),
        tile(Suit.Wan, 2, 2), tile(Suit.Wan, 2, 3),
        tile(Suit.Wan, 3, 4), tile(Suit.Wan, 3, 5),
        tile(Suit.Tiao, 4, 6), tile(Suit.Tiao, 4, 7),
        tile(Suit.Tiao, 5, 8), tile(Suit.Tiao, 5, 9),
        tile(Suit.Tong, 6, 10), tile(Suit.Tong, 6, 11),
        tile(Suit.Tong, 8, 12), tile(Suit.Tong, 8, 13),
      ];
      expect(WinDetector.isQiXiaoDui(hand)).toBe(true);
    });

    it('should reject non-seven-pairs', () => {
      const hand: Tile[] = [
        tile(Suit.Wan, 1, 0), tile(Suit.Wan, 1, 1),
        tile(Suit.Wan, 2, 2), tile(Suit.Wan, 3, 3),
        tile(Suit.Wan, 4, 4), tile(Suit.Wan, 4, 5),
        tile(Suit.Tiao, 5, 6), tile(Suit.Tiao, 5, 7),
        tile(Suit.Tiao, 6, 8), tile(Suit.Tiao, 6, 9),
        tile(Suit.Tong, 7, 10), tile(Suit.Tong, 7, 11),
        tile(Suit.Tong, 8, 12), tile(Suit.Tong, 8, 13),
      ];
      expect(WinDetector.isQiXiaoDui(hand)).toBe(false);
    });
  });

  describe('碰碰胡', () => {
    it('should detect peng peng hu', () => {
      const hand: Tile[] = [
        tile(Suit.Wan, 1, 0), tile(Suit.Wan, 1, 1), tile(Suit.Wan, 1, 2),
        tile(Suit.Wan, 2, 3), tile(Suit.Wan, 2, 4), tile(Suit.Wan, 2, 5),
        tile(Suit.Tiao, 3, 6), tile(Suit.Tiao, 3, 7), tile(Suit.Tiao, 3, 8),
        tile(Suit.Tong, 4, 9), tile(Suit.Tong, 4, 10), tile(Suit.Tong, 4, 11),
        tile(Suit.Tong, 5, 12), tile(Suit.Tong, 5, 13),
      ];
      expect(WinDetector.isPengPengHu(hand)).toBe(true);
    });
  });

  describe('清一色', () => {
    it('should detect qing yi se', () => {
      const hand: Tile[] = [
        tile(Suit.Wan, 1, 0), tile(Suit.Wan, 2, 1), tile(Suit.Wan, 3, 2),
        tile(Suit.Wan, 4, 3), tile(Suit.Wan, 5, 4), tile(Suit.Wan, 6, 5),
        tile(Suit.Wan, 7, 6), tile(Suit.Wan, 8, 7), tile(Suit.Wan, 9, 8),
        tile(Suit.Wan, 1, 9), tile(Suit.Wan, 1, 10), tile(Suit.Wan, 1, 11),
        tile(Suit.Wan, 5, 12), tile(Suit.Wan, 5, 13),
      ];
      expect(WinDetector.isQingYiSe(hand)).toBe(true);
    });

    it('should reject mixed suits', () => {
      const hand: Tile[] = [
        tile(Suit.Wan, 1, 0), tile(Suit.Tiao, 2, 1),
      ];
      expect(WinDetector.isQingYiSe(hand)).toBe(false);
    });
  });

  describe('将将胡', () => {
    it('should detect jiang jiang hu', () => {
      const hand: Tile[] = [
        tile(Suit.Wan, 2, 0), tile(Suit.Wan, 2, 1), tile(Suit.Wan, 2, 2),
        tile(Suit.Wan, 5, 3), tile(Suit.Wan, 5, 4), tile(Suit.Wan, 5, 5),
        tile(Suit.Tiao, 8, 6), tile(Suit.Tiao, 8, 7), tile(Suit.Tiao, 8, 8),
        tile(Suit.Tong, 2, 9), tile(Suit.Tong, 2, 10), tile(Suit.Tong, 2, 11),
        tile(Suit.Tong, 5, 12), tile(Suit.Tong, 5, 13),
      ];
      expect(WinDetector.isJiangJiangHu(hand)).toBe(true);
    });
  });

  describe('起手胡', () => {
    it('should detect si xi (four of a kind)', () => {
      const hand = [
        tile(Suit.Wan, 1, 0), tile(Suit.Wan, 1, 1), tile(Suit.Wan, 1, 2), tile(Suit.Wan, 1, 3),
        tile(Suit.Tiao, 2, 4), tile(Suit.Tiao, 3, 5), tile(Suit.Tong, 4, 6),
      ];
      const wins = WinDetector.checkInitialWins(hand);
      expect(wins).toContain('si_xi');
    });

    it('should detect ban ban hu (no 2/5/8)', () => {
      const hand = [
        tile(Suit.Wan, 1, 0), tile(Suit.Wan, 3, 1), tile(Suit.Wan, 4, 2),
        tile(Suit.Tiao, 6, 3), tile(Suit.Tiao, 7, 4), tile(Suit.Tong, 9, 5),
      ];
      const wins = WinDetector.checkInitialWins(hand);
      expect(wins).toContain('ban_ban_hu');
    });

    it('should detect que yi se (missing one suit)', () => {
      const hand = [
        tile(Suit.Wan, 1, 0), tile(Suit.Wan, 2, 1),
        tile(Suit.Tiao, 3, 2), tile(Suit.Tiao, 4, 3),
      ];
      const wins = WinDetector.checkInitialWins(hand);
      expect(wins).toContain('que_yi_se');
    });
  });
});
