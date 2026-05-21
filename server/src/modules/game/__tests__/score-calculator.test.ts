import { ScoreCalculator, BirdResult } from '../score-calculator';
import { WinType, Suit, Tile } from '../../../../../shared/constants';

describe('ScoreCalculator', () => {
  describe('calculateScore', () => {
    it('should calculate small win self-draw scores', () => {
      const result = ScoreCalculator.calculateScore({
        winnerIndex: [0],
        winTypes: [],
        isSelfDraw: true,
        dianPaoIndex: -1,
        dealerIndex: 0,
        baseScore: 10,
      });
      expect(result.scores[0]).toBeGreaterThan(0);
      expect(result.scores[1]).toBeLessThan(0);
    });

    it('should calculate big win with higher multiplier', () => {
      const result = ScoreCalculator.calculateScore({
        winnerIndex: [1],
        winTypes: [WinType.QingYiSe],
        isSelfDraw: true,
        dianPaoIndex: -1,
        dealerIndex: 0,
        baseScore: 10,
      });
      const smallResult = ScoreCalculator.calculateScore({
        winnerIndex: [1],
        winTypes: [],
        isSelfDraw: true,
        dianPaoIndex: -1,
        dealerIndex: 0,
        baseScore: 10,
      });
      expect(Math.abs(result.scores[1])).toBeGreaterThan(Math.abs(smallResult.scores[1]));
    });

    it('should double big wins when stacked', () => {
      const single = ScoreCalculator.calculateScore({
        winnerIndex: [0],
        winTypes: [WinType.QingYiSe],
        isSelfDraw: true,
        dianPaoIndex: -1,
        dealerIndex: 0,
        baseScore: 10,
      });
      const double_ = ScoreCalculator.calculateScore({
        winnerIndex: [0],
        winTypes: [WinType.QingYiSe, WinType.PengPengHu],
        isSelfDraw: true,
        dianPaoIndex: -1,
        dealerIndex: 0,
        baseScore: 10,
      });
      expect(Math.abs(double_.scores[0])).toBeGreaterThan(Math.abs(single.scores[0]));
    });
  });

  describe('calculateBirds', () => {
    it('should map bird tile to correct seat', () => {
      const birdTile: Tile = { suit: Suit.Wan, value: 3, id: 10 };
      const result = ScoreCalculator.calculateBirds([birdTile], 0);
      expect(result.birdSeats[0]).toBe(2);
    });

    it('should handle value > 4 with wrap', () => {
      const birdTile: Tile = { suit: Suit.Tiao, value: 6, id: 20 };
      const result = ScoreCalculator.calculateBirds([birdTile], 0);
      expect(result.birdSeats[0]).toBe(1);
    });
  });

  describe('applyBirdMultipliers', () => {
    it('should double score for bird-matched player on self-draw', () => {
      const baseScores = [-10, 30, -10, -10];
      const birdResult: BirdResult = {
        birdTiles: [{ suit: Suit.Wan, value: 2, id: 50 }],
        birdSeats: [2],
        multipliers: [1, 1, 2, 1],
      };
      const final = ScoreCalculator.applyBirdMultipliers(baseScores, birdResult, 1, true, -1);
      expect(final[2]).toBe(-20);
      expect(final[0]).toBe(-10);
    });
  });
});
