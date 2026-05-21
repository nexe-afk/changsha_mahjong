import { Tile, WinType, BIG_WIN_TYPES } from '../../../../shared/constants';

export interface BirdResult {
  birdTiles: Tile[];
  birdSeats: number[];
  multipliers: number[];
}

export interface ScoreInput {
  winnerIndex: number[];
  winTypes: WinType[];
  isSelfDraw: boolean;
  dianPaoIndex: number;
  dealerIndex: number;
  baseScore: number;
}

export interface ScoreOutput {
  scores: number[];
}

export class ScoreCalculator {

  static calculateScore(input: ScoreInput): ScoreOutput {
    const { winnerIndex, winTypes, isSelfDraw, dianPaoIndex, dealerIndex, baseScore } = input;
    const scores = [0, 0, 0, 0];

    const isBigWin = winTypes.length > 0;
    const bigWinCount = winTypes.filter(w => BIG_WIN_TYPES.includes(w)).length;
    const dealerBonus = 10;
    const smallBase = baseScore;
    const bigBase = baseScore * 3;

    for (const winner of winnerIndex) {
      const isDealer = winner === dealerIndex;
      const winBase = isBigWin ? bigBase * Math.max(1, bigWinCount) : smallBase;

      if (isSelfDraw) {
        for (let i = 0; i < 4; i++) {
          if (i === winner) continue;
          let lose = winBase;
          if (i === dealerIndex || isDealer) lose += dealerBonus;
          scores[i] -= lose;
          scores[winner] += lose;
        }
      } else {
        let lose = winBase * 2;
        if (dianPaoIndex === dealerIndex || isDealer) lose += dealerBonus;
        scores[dianPaoIndex] -= lose;
        scores[winner] += lose;
      }
    }
    return { scores };
  }

  static calculateBirds(birdTiles: Tile[], dealerIndex: number): BirdResult {
    const birdSeats: number[] = [];
    const multipliers = [1, 1, 1, 1];

    for (const bird of birdTiles) {
      const offset = ((bird.value - 1) % 4);
      const seat = (dealerIndex + offset) % 4;
      birdSeats.push(seat);
      multipliers[seat] *= 2;
    }

    return { birdTiles, birdSeats, multipliers };
  }

  static applyBirdMultipliers(
    baseScores: number[],
    birdResult: BirdResult,
    winnerIndex: number,
    isSelfDraw: boolean,
    dianPaoIndex: number,
  ): number[] {
    const final = [...baseScores];
    const totalMultiplier = birdResult.multipliers;

    if (isSelfDraw) {
      for (let i = 0; i < 4; i++) {
        if (i === winnerIndex) continue;
        final[i] = baseScores[i] * totalMultiplier[i];
      }
      final[winnerIndex] = -final.reduce((sum, s, i) => i !== winnerIndex ? sum + s : sum, 0);
    } else {
      final[dianPaoIndex] = baseScores[dianPaoIndex] * totalMultiplier[dianPaoIndex];
      final[winnerIndex] = -final[dianPaoIndex];
      for (let i = 0; i < 4; i++) {
        if (i !== winnerIndex && i !== dianPaoIndex) {
          final[i] = baseScores[i] * totalMultiplier[i];
        }
      }
    }

    return final;
  }
}
