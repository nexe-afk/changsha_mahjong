import { ActionType, WinType, InitialWinType } from './constants';

export interface ClientToServerEvents {
  'room:join': (data: { roomId?: string; roomType: string }) => void;
  'room:ready': () => void;
  'room:leave': () => void;
  'game:discard': (data: { tileId: number }) => void;
  'game:chow': (data: { tileIds: number[] }) => void;
  'game:pong': () => void;
  'game:kong': (data: { tileId: number; kongType: 'ming' | 'ang' }) => void;
  'game:win': () => void;
  'game:pass': () => void;
  'game:sea_choice': (data: { take: boolean }) => void;
}

export interface PlayerState {
  seatIndex: number;
  handTileCount: number;
  melds: Array<{ type: string; tiles: number[] }>;
  discardedTiles: number[];
  isOnline: boolean;
}

export interface ServerToClientEvents {
  'room:state': (data: {
    roomId: string;
    players: Array<{ seatIndex: number; userId: string; nickname: string; avatar: string; ready: boolean; isOnline: boolean }>;
    roomType: string;
    baseScore: number;
  }) => void;
  'game:start': (data: {
    handTileIds: number[];
    dealerIndex: number;
    yourSeatIndex: number;
    wallRemaining: number;
  }) => void;
  'game:turn': (data: { seatIndex: number; timeout: number }) => void;
  'game:tile_drawn': (data: { tileId: number }) => void;
  'game:tile_drawn_other': (data: { seatIndex: number }) => void;
  'game:tile_discarded': (data: { seatIndex: number; tileId: number }) => void;
  'game:action_prompt': (data: {
    actions: Array<{ type: ActionType; options?: any }>;
    timeout: number;
  }) => void;
  'game:action_result': (data: {
    seatIndex: number;
    action: ActionType;
    tiles?: number[];
  }) => void;
  'game:initial_win': (data: {
    wins: Array<{ seatIndex: number; type: InitialWinType }>;
  }) => void;
  'game:result': (data: {
    winnerIndex: number[];
    winTypes: WinType[][];
    isSelfDraw: boolean;
    dianPaoIndex: number;
    scores: number[];
    handTiles: number[][];
    melds: Array<Array<{ type: string; tiles: number[] }>>;
  }) => void;
  'game:bird_reveal': (data: {
    birdTiles: number[];
    birdSeats: number[];
    multipliers: number[];
  }) => void;
  'game:final_scores': (data: {
    scoreChanges: number[];
    coinChanges: number[];
    dealerIndex: number;
  }) => void;
  'game:sea_roaming': (data: {
    currentSeatIndex: number;
    tileId: number;
    isYourTurn: boolean;
  }) => void;
  'error': (data: { message: string }) => void;
}
