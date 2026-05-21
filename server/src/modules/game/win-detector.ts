import { Tile, Suit, JIANG_VALUES, WinType, InitialWinType, BIG_WIN_TYPES } from '../../../../shared/constants';

export interface WinCheckResult {
  canWin: boolean;
  jiangValue?: number;
  melds?: Tile[][];
}

export interface WinAnalysis {
  winTypes: WinType[];
  isBigWin: boolean;
  bigWinCount: number;
}

export class WinDetector {

  static checkBasicWin(hand: Tile[], wildJiang: boolean = false): WinCheckResult {
    if (hand.length !== 14) return { canWin: false };
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        if (hand[i].suit === hand[j].suit && hand[i].value === hand[j].value) {
          const pairValue = hand[i].value;
          if (!wildJiang && !JIANG_VALUES.includes(pairValue as any)) continue;
          const remaining = hand.filter((_, idx) => idx !== i && idx !== j);
          if (WinDetector.canFormMelds(remaining)) {
            return { canWin: true, jiangValue: pairValue };
          }
        }
      }
    }
    return { canWin: false };
  }

  private static canFormMelds(tiles: Tile[]): boolean {
    if (tiles.length === 0) return true;
    if (tiles.length % 3 !== 0) return false;
    const sorted = [...tiles].sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return a.value - b.value;
    });
    return WinDetector.tryFormMelds(sorted);
  }

  private static tryFormMelds(sorted: Tile[]): boolean {
    if (sorted.length === 0) return true;

    const first = sorted[0];

    // Try triplet (刻子): first tile + two matching tiles
    const hasTriplet = sorted.length >= 3 &&
      sorted[1].suit === first.suit && sorted[1].value === first.value &&
      sorted[2].suit === first.suit && sorted[2].value === first.value;

    if (hasTriplet) {
      const rest = sorted.slice(3);
      if (WinDetector.tryFormMelds(rest)) return true;
    }

    // Try sequence (顺子): first tile + v+1 + v+2 in same suit
    const midIdx = sorted.findIndex((t, i) => i > 0 && t.suit === first.suit && t.value === first.value + 1);
    const endIdx = sorted.findIndex((t, i) => i > 0 && t.suit === first.suit && t.value === first.value + 2);

    if (midIdx !== -1 && endIdx !== -1) {
      const rest = sorted.filter((_, i) => i !== 0 && i !== midIdx && i !== endIdx);
      if (WinDetector.tryFormMelds(rest)) return true;
    }

    return false;
  }

  static isQiXiaoDui(hand: Tile[]): boolean {
    if (hand.length !== 14) return false;
    const counts = new Map<string, number>();
    for (const t of hand) {
      const key = `${t.suit}-${t.value}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    if (counts.size !== 7) return false;
    for (const count of counts.values()) {
      if (count !== 2) return false;
    }
    return true;
  }

  static isPengPengHu(hand: Tile[], meldTiles: Tile[] = []): boolean {
    const allTiles = [...hand, ...meldTiles];
    const counts = new Map<string, number>();
    for (const t of allTiles) {
      const key = `${t.suit}-${t.value}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let pairs = 0;
    let triplets = 0;
    for (const count of counts.values()) {
      if (count === 2) pairs++;
      else if (count === 3) triplets++;
      else if (count === 4) { triplets++; pairs++; }
      else return false;
    }
    const totalMelds = meldTiles.length / 3;
    return pairs === 1 && triplets === 4 - totalMelds;
  }

  static isQingYiSe(hand: Tile[], meldTiles: Tile[] = []): boolean {
    const allTiles = [...hand, ...meldTiles];
    if (allTiles.length === 0) return false;
    const firstSuit = allTiles[0].suit;
    return allTiles.every(t => t.suit === firstSuit);
  }

  static isJiangJiangHu(hand: Tile[], meldTiles: Tile[] = []): boolean {
    const allTiles = [...hand, ...meldTiles];
    return allTiles.every(t => JIANG_VALUES.includes(t.value as any));
  }

  static analyzeWin(hand: Tile[], isDealer: boolean, isFirstTurn: boolean, isSelfDraw: boolean, context: {
    isAfterKong: boolean;
    isSeaBottom: boolean;
    isRobKong: boolean;
    allTilesInPlay: Tile[];
    melds: Array<{ type: string; tiles: Tile[] }>;
  }): WinAnalysis {
    const winTypes: WinType[] = [];
    const meldTiles = context.melds.flatMap(m => m.tiles);

    if (isDealer && isFirstTurn && isSelfDraw) winTypes.push(WinType.TianHu);
    if (!isDealer && isFirstTurn && !isSelfDraw) winTypes.push(WinType.DiHu);
    if (WinDetector.isPengPengHu(hand, meldTiles)) winTypes.push(WinType.PengPengHu);
    if (WinDetector.isJiangJiangHu(hand, meldTiles)) winTypes.push(WinType.JiangJiangHu);
    if (WinDetector.isQingYiSe(hand, meldTiles)) winTypes.push(WinType.QingYiSe);
    if (meldTiles.length === 0 && WinDetector.isQiXiaoDui(hand)) winTypes.push(WinType.QiXiaoDui);

    if (context.melds.length === 4 && hand.length === 1) {
      winTypes.push(WinType.QuanQiuRen);
    }

    if (context.isSeaBottom && isSelfDraw) winTypes.push(WinType.HaiDiLaoYue);
    if (context.isAfterKong && isSelfDraw) winTypes.push(WinType.GangShangKaiHua);
    if (context.isAfterKong && !isSelfDraw) winTypes.push(WinType.GangShangPao);
    if (context.isRobKong) winTypes.push(WinType.QiangGangHu);

    const bigWinCount = winTypes.length;
    const isBigWin = bigWinCount > 0;

    return { winTypes, isBigWin, bigWinCount };
  }

  static checkInitialWins(hand: Tile[]): InitialWinType[] {
    const wins: InitialWinType[] = [];
    const counts = new Map<string, number>();
    for (const t of hand) {
      const key = `${t.suit}-${t.value}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (const [, count] of counts) {
      if (count === 4) { wins.push(InitialWinType.SiXi); break; }
    }
    const hasJiang = hand.some(t => JIANG_VALUES.includes(t.value as any));
    if (!hasJiang) wins.push(InitialWinType.BanBanHu);
    const hasWan = hand.some(t => t.suit === Suit.Wan);
    const hasTiao = hand.some(t => t.suit === Suit.Tiao);
    const hasTong = hand.some(t => t.suit === Suit.Tong);
    const missingCount = (!hasWan ? 1 : 0) + (!hasTiao ? 1 : 0) + (!hasTong ? 1 : 0);
    if (missingCount === 1) wins.push(InitialWinType.QueYiSe);
    let tripletCount = 0;
    for (const count of counts.values()) {
      if (count >= 3) tripletCount++;
    }
    if (tripletCount >= 2) wins.push(InitialWinType.LiuLiuShun);
    return wins;
  }
}
