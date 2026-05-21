// === 牌的定义 ===
export enum Suit {
  Wan = 'wan',   // 万
  Tiao = 'tiao', // 条
  Tong = 'tong', // 筒
}

export type TileValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Tile {
  suit: Suit;
  value: TileValue;
  id: number; // 唯一标识 0-107
}

// 将牌数值
export const JIANG_VALUES: TileValue[] = [2, 5, 8];

// 生成完整牌组 (108张)
export function createFullDeck(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;
  for (const suit of [Suit.Wan, Suit.Tiao, Suit.Tong]) {
    for (let value: TileValue = 1; value <= 9; value++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ suit, value: value as TileValue, id: id++ });
      }
    }
  }
  return tiles;
}

// === 番型 ===
export enum WinType {
  Small = 'small',
  TianHu = 'tian_hu',
  DiHu = 'di_hu',
  PengPengHu = 'peng_peng_hu',
  JiangJiangHu = 'jiang_jiang_hu',
  QingYiSe = 'qing_yi_se',
  QiXiaoDui = 'qi_xiao_dui',
  QuanQiuRen = 'quan_qiu_ren',
  HaiDiLaoYue = 'hai_di_lao_yue',
  GangShangKaiHua = 'gang_shang_kai_hua',
  GangShangPao = 'gang_shang_pao',
  QiangGangHu = 'qiang_gang_hu',
}

export enum InitialWinType {
  SiXi = 'si_xi',
  BanBanHu = 'ban_ban_hu',
  QueYiSe = 'que_yi_se',
  LiuLiuShun = 'liu_liu_shun',
}

export const BIG_WIN_TYPES: WinType[] = [
  WinType.TianHu, WinType.DiHu, WinType.PengPengHu,
  WinType.JiangJiangHu, WinType.QingYiSe, WinType.QiXiaoDui,
  WinType.QuanQiuRen, WinType.HaiDiLaoYue, WinType.GangShangKaiHua,
  WinType.GangShangPao, WinType.QiangGangHu,
];

export function isWildJiang(winType: WinType): boolean {
  return [
    WinType.TianHu, WinType.DiHu, WinType.PengPengHu,
    WinType.JiangJiangHu, WinType.QingYiSe, WinType.QiXiaoDui,
    WinType.QuanQiuRen,
  ].includes(winType);
}

// === 操作类型 ===
export enum ActionType {
  Discard = 'discard',
  Chow = 'chow',
  Pong = 'pong',
  Kong = 'kong',
  AngKong = 'ang_kong',
  Win = 'win',
  Pass = 'pass',
  Draw = 'draw',
}

// === 游戏阶段 ===
export enum GamePhase {
  Waiting = 'waiting',
  Dealing = 'dealing',
  InitialCheck = 'initial_check',
  Playing = 'playing',
  SeaRoaming = 'sea_roaming',
  BirdReveal = 'bird_reveal',
  Result = 'result',
  Finished = 'finished',
}

export enum RoomStatus {
  Waiting = 'waiting',
  Playing = 'playing',
  Finished = 'finished',
}

export enum RoomType {
  Match = 'match',
  Friend = 'friend',
}
