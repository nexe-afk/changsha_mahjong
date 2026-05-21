import { Tile, Suit, ActionType, GamePhase, WinType, JIANG_VALUES } from '../../../../shared/constants';
import { TileManager } from './tile-manager';
import { TurnManager } from './turn-manager';
import { ActionValidator } from './action-validator';
import { WinDetector, WinAnalysis } from './win-detector';
import { ScoreCalculator, BirdResult } from './score-calculator';
import { ReplayRecorder } from './replay-recorder';

export interface PlayerState {
  seatIndex: number;
  userId: string;
  hand: Tile[];
  melds: Array<{ type: string; tiles: Tile[] }>;
  discards: Tile[];
  isOnline: boolean;
  isReady: boolean;
}

export interface GameEvent {
  event: string;
  data: any;
  targets?: number[];
}

export class GameEngine {
  private tileManager: TileManager;
  private turnManager: TurnManager;
  private replayRecorder: ReplayRecorder;
  private players: PlayerState[];
  private dealerIndex: number;
  private phase: GamePhase = GamePhase.Waiting;
  private lastDiscardedTile: Tile | null = null;
  private lastDiscardSeat: number = -1;
  private isAfterKong = false;
  private isSeaBottom = false;
  private isRobKong = false;
  private eventQueue: GameEvent[] = [];
  private pendingActionSeats = new Set<number>();
  private actionTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventCallback: ((events: GameEvent[]) => void) | null = null;

  constructor(playerIds: string[], dealerIndex: number) {
    this.dealerIndex = dealerIndex;
    this.tileManager = new TileManager();
    this.turnManager = new TurnManager(dealerIndex, 30000);
    this.replayRecorder = new ReplayRecorder();
    this.players = playerIds.map((userId, i) => ({
      seatIndex: i, userId,
      hand: [], melds: [], discards: [],
      isOnline: true, isReady: false,
    }));
  }

  setEventCallback(cb: (events: GameEvent[]) => void): void {
    this.eventCallback = cb;
  }

  start(): GameEvent[] {
    this.eventQueue = [];
    this.phase = GamePhase.Dealing;
    const hands = this.tileManager.deal(this.dealerIndex);

    for (let i = 0; i < 4; i++) {
      this.players[i].hand = hands[i];
      this.emit('game:start', {
        handTileIds: hands[i].map(t => t.id),
        dealerIndex: this.dealerIndex,
        yourSeatIndex: i,
        wallRemaining: this.tileManager.wallRemaining,
      }, [i]);
    }

    this.replayRecorder.record({ type: 'deal', seatIndex: -1 });

    this.phase = GamePhase.InitialCheck;
    this.checkInitialWins();

    this.phase = GamePhase.Playing;
    this.turnManager.setTurn(this.dealerIndex);
    this.emit('game:turn', { seatIndex: this.dealerIndex, timeout: 30000 });
    this.turnManager.setTimeoutCallback(() => this.handleTimeout());

    return this.flushEvents();
  }

  private checkInitialWins(): void {
    for (let i = 0; i < 4; i++) {
      const initialWins = WinDetector.checkInitialWins(this.players[i].hand);
      if (initialWins.length > 0) {
        this.emit('game:initial_win', {
          wins: [{ seatIndex: i, type: initialWins }],
        });
        this.replayRecorder.record({ type: 'initial_win', seatIndex: i, tileIds: [] });
      }
    }
  }

  discard(seatIndex: number, tileId: number): GameEvent[] {
    this.eventQueue = [];
    const player = this.players[seatIndex];
    const tileIdx = player.hand.findIndex(t => t.id === tileId);
    if (tileIdx === -1) {
      this.emit('error', { message: 'Tile not in hand' }, [seatIndex]);
      return this.flushEvents();
    }

    const tile = player.hand.splice(tileIdx, 1)[0];
    player.discards.push(tile);
    this.lastDiscardedTile = tile;
    this.lastDiscardSeat = seatIndex;

    this.replayRecorder.record({ type: 'discard', seatIndex, tileIds: [tileId] });
    this.emit('game:tile_discarded', { seatIndex, tileId: tile.id });

    this.isSeaBottom = this.tileManager.wallRemaining === 0;

    if (this.isSeaBottom) {
      this.phase = GamePhase.SeaRoaming;
      const nextSeat = (seatIndex + 1) % 4;
      for (let i = 0; i < 4; i++) {
        this.emit('game:sea_roaming', {
          currentSeatIndex: nextSeat,
          tileId: tile.id,
          isYourTurn: i === nextSeat,
        }, [i]);
      }
      this.checkActionsForDiscard(tile, seatIndex);
      return this.flushEvents();
    }

    this.checkActionsForDiscard(tile, seatIndex);
    return this.flushEvents();
  }

  private checkActionsForDiscard(tile: Tile, fromSeat: number): void {
    this.pendingActionSeats.clear();
    if (this.actionTimeout) { clearTimeout(this.actionTimeout); this.actionTimeout = null; }

    let hasAction = false;

    for (let i = 0; i < 4; i++) {
      if (i === fromSeat) continue;
      const actions: any[] = [];

      const testHand = [...this.players[i].hand, tile];
      const meldTiles = this.players[i].melds.flatMap(m => m.tiles);
      const canSmallWin = WinDetector.checkBasicWin(testHand, false).canWin;
      const canBigWinBasic = WinDetector.checkBasicWin(testHand, true).canWin;
      const canQiXiaoDui = meldTiles.length === 0 && WinDetector.isQiXiaoDui(testHand);
      const canPengPeng = WinDetector.isPengPengHu(testHand, meldTiles);
      const canJiangJiang = WinDetector.isJiangJiangHu(testHand, meldTiles);
      const canAnyWin = canSmallWin || canBigWinBasic || canQiXiaoDui || canPengPeng || canJiangJiang;

      if (canAnyWin) {
        actions.push({ type: ActionType.Win });
      }

      if (ActionValidator.canPong(this.players[i].hand, tile)) {
        actions.push({ type: ActionType.Pong });
        if (ActionValidator.canMingKong(this.players[i].hand, tile)) {
          actions.push({ type: ActionType.Kong, kongType: 'ming' });
        }
      }

      if (this.turnManager.isNextPlayer(i, fromSeat) && ActionValidator.canChow(this.players[i].hand, tile)) {
        const options = ActionValidator.getChowOptions(this.players[i].hand, tile);
        actions.push({ type: ActionType.Chow, options });
      }

      if (actions.length > 0) {
        hasAction = true;
        this.pendingActionSeats.add(i);
        this.emit('game:action_prompt', { actions, timeout: 15000 }, [i]);
      }
    }

    if (!hasAction) {
      this.advanceToNextPlayer();
    } else {
      // Pause the 30s turn timer while players decide whether to pong/win/chow.
      // Without this, handleTimeout fires for the discarder mid-action-window.
      this.turnManager.clearTimeout();
      this.actionTimeout = setTimeout(() => {
        this.eventQueue = [];
        this.pendingActionSeats.clear();
        this.lastDiscardedTile = null;
        this.advanceToNextPlayer();
        // Dispatch the queued events (game:turn, game:tile_drawn …) that would
        // otherwise be lost — the normal public-method path returns them via
        // flushEvents(), but a timeout callback has no caller to do that.
        this.eventCallback?.(this.flushEvents());
      }, 15000);
    }
  }

  private advanceToNextPlayer(): void {
    this.turnManager.nextTurn();
    const drawn = this.tileManager.drawFromWall();
    if (!drawn) {
      this.endGameDraw();
      return;
    }
    const current = this.turnManager.currentTurn;
    this.players[current].hand.push(drawn);

    if (this.tileManager.wallRemaining === 0) {
      this.isSeaBottom = true;
    }

    this.lastDiscardedTile = null;
    this.emit('game:tile_drawn', { tileId: drawn.id }, [current]);
    this.emit('game:tile_drawn_other', { seatIndex: current });
    this.emit('game:turn', { seatIndex: current, timeout: 30000 });

    const drawnPlayer = this.players[current];
    const meldTiles = drawnPlayer.melds.flatMap(m => m.tiles);
    const canSelfWin = WinDetector.checkBasicWin(drawnPlayer.hand, false).canWin
      || WinDetector.checkBasicWin(drawnPlayer.hand, true).canWin
      || (meldTiles.length === 0 && WinDetector.isQiXiaoDui(drawnPlayer.hand))
      || WinDetector.isPengPengHu(drawnPlayer.hand, meldTiles)
      || WinDetector.isJiangJiangHu(drawnPlayer.hand, meldTiles);
    if (canSelfWin) {
      this.emit('game:action_prompt', { actions: [{ type: ActionType.Win }], timeout: 30000 }, [current]);
    }

    this.isAfterKong = false;
  }

  pong(seatIndex: number): GameEvent[] {
    this.eventQueue = [];
    this.clearPendingActions();
    if (!this.lastDiscardedTile) return this.flushEvents();

    const player = this.players[seatIndex];
    const tile = this.lastDiscardedTile;
    const matching = player.hand.filter(t => t.suit === tile.suit && t.value === tile.value);

    if (matching.length < 2) {
      this.emit('error', { message: 'Cannot pong' }, [seatIndex]);
      return this.flushEvents();
    }

    const pongTiles = [tile, matching[0], matching[1]];
    player.hand = player.hand.filter(t => t !== matching[0] && t !== matching[1]);
    player.melds.push({ type: 'pong', tiles: pongTiles });

    const discarder = this.players[this.lastDiscardSeat];
    discarder.discards.pop();

    this.replayRecorder.record({ type: 'pong', seatIndex, tileIds: pongTiles.map(t => t.id) });
    this.emit('game:action_result', { seatIndex, action: ActionType.Pong, tiles: pongTiles.map(t => t.id), fromSeat: this.lastDiscardSeat });

    this.isAfterKong = false;
    this.lastDiscardedTile = null;
    this.turnManager.setTurn(seatIndex);
    this.emit('game:turn', { seatIndex, timeout: 30000 });
    return this.flushEvents();
  }

  kong(seatIndex: number, tileId: number, kongType: 'ming' | 'ang'): GameEvent[] {
    this.eventQueue = [];
    this.clearPendingActions();

    if (kongType === 'ang') {
      const player = this.players[seatIndex];
      const tile = player.hand.find(t => t.id === tileId);
      if (!tile) { this.emit('error', { message: 'Tile not found' }, [seatIndex]); return this.flushEvents(); }

      const matching = player.hand.filter(t => t.suit === tile.suit && t.value === tile.value);
      if (matching.length < 4) { this.emit('error', { message: 'Cannot ang kong' }, [seatIndex]); return this.flushEvents(); }

      player.hand = player.hand.filter(t => t.suit !== tile.suit || t.value !== tile.value);
      player.melds.push({ type: 'ang_kong', tiles: matching });
      this.replayRecorder.record({ type: 'ang_kong', seatIndex, tileIds: matching.map(t => t.id) });
      this.emit('game:action_result', { seatIndex, action: ActionType.Kong, tiles: matching.map(t => t.id), fromSeat: -1 });
    } else {
      if (!this.lastDiscardedTile) return this.flushEvents();
      const player = this.players[seatIndex];
      const tile = this.lastDiscardedTile;

      const matching = player.hand.filter(t => t.suit === tile.suit && t.value === tile.value);
      if (matching.length < 3) { this.emit('error', { message: 'Cannot ming kong' }, [seatIndex]); return this.flushEvents(); }

      const kongTiles = [tile, ...matching.slice(0, 3)];
      player.hand = player.hand.filter(t => !kongTiles.includes(t));
      player.melds.push({ type: 'ming_kong', tiles: kongTiles });

      const discarder = this.players[this.lastDiscardSeat];
      discarder.discards.pop();

      this.replayRecorder.record({ type: 'ming_kong', seatIndex, tileIds: kongTiles.map(t => t.id) });
      this.emit('game:action_result', { seatIndex, action: ActionType.Kong, tiles: kongTiles.map(t => t.id), fromSeat: this.lastDiscardSeat });
    }

    this.isAfterKong = true;
    this.lastDiscardedTile = null;
    const drawn = this.tileManager.drawFromWall();
    if (drawn) {
      this.players[seatIndex].hand.push(drawn);
      this.emit('game:tile_drawn', { tileId: drawn.id }, [seatIndex]);
      this.emit('game:tile_drawn_other', { seatIndex });
    } else {
      this.endGameDraw();
      return this.flushEvents();
    }

    this.turnManager.setTurn(seatIndex);
    this.emit('game:turn', { seatIndex, timeout: 30000 });
    return this.flushEvents();
  }

  win(seatIndex: number): GameEvent[] {
    this.eventQueue = [];
    this.clearPendingActions();
    const player = this.players[seatIndex];
    const hand = player.hand;
    const isSelfDraw = this.lastDiscardedTile === null;

    const analysis = WinDetector.analyzeWin(hand, seatIndex === this.dealerIndex,
      this.turnManager.isFirstTurn, isSelfDraw, {
        isAfterKong: this.isAfterKong,
        isSeaBottom: this.isSeaBottom,
        isRobKong: this.isRobKong,
        allTilesInPlay: [],
        melds: player.melds,
      });

    const canWinBasic = WinDetector.checkBasicWin(hand, true).canWin;
    const meldTiles = player.melds.flatMap(m => m.tiles);
    const isQiXiaoDui = meldTiles.length === 0 && WinDetector.isQiXiaoDui(hand);
    const isPengPeng = WinDetector.isPengPengHu(hand, meldTiles);
    const isJiangJiang = WinDetector.isJiangJiangHu(hand, meldTiles);

    if (!canWinBasic && !isQiXiaoDui && !isPengPeng && !isJiangJiang) {
      this.emit('error', { message: '当前手牌不满足胡牌条件' }, [seatIndex]);
      return this.flushEvents();
    }

    this.phase = GamePhase.Result;

    const birdTiles: Tile[] = [];
    for (let i = 0; i < 2; i++) {
      const bird = this.tileManager.drawFromEnd();
      if (bird) birdTiles.push(bird);
    }
    const birdResult = ScoreCalculator.calculateBirds(birdTiles, this.dealerIndex);
    this.emit('game:bird_reveal', {
      birdTiles: birdTiles.map(t => t.id),
      birdSeats: birdResult.birdSeats,
      multipliers: birdResult.multipliers,
    });

    const scoreResult = ScoreCalculator.calculateScore({
      winnerIndex: [seatIndex],
      winTypes: analysis.winTypes,
      isSelfDraw,
      dianPaoIndex: this.lastDiscardSeat,
      dealerIndex: this.dealerIndex,
      baseScore: 10,
    });

    const finalScores = ScoreCalculator.applyBirdMultipliers(
      scoreResult.scores, birdResult, seatIndex,
      isSelfDraw, this.lastDiscardSeat,
    );

    this.emit('game:result', {
      winnerIndex: [seatIndex],
      winTypes: analysis.winTypes,
      isSelfDraw,
      dianPaoIndex: this.lastDiscardSeat,
      scores: finalScores,
      handTiles: this.players.map(p => p.hand.map(t => t.id)),
      melds: this.players.map(p => p.melds.map(m => ({ type: m.type, tiles: m.tiles.map(t => t.id) }))),
    });

    this.emit('game:final_scores', {
      scoreChanges: finalScores,
      coinChanges: finalScores,
      dealerIndex: seatIndex,
    });

    this.replayRecorder.record({ type: 'win', seatIndex });
    this.phase = GamePhase.Finished;
    this.turnManager.destroy();

    return this.flushEvents();
  }

  private endGameDraw(): void {
    this.phase = GamePhase.Finished;
    this.emit('game:result', {
      winnerIndex: [],
      winTypes: [],
      isSelfDraw: false,
      dianPaoIndex: -1,
      scores: [0, 0, 0, 0],
      handTiles: this.players.map(p => p.hand.map(t => t.id)),
      melds: this.players.map(p => p.melds.map(m => ({ type: m.type, tiles: m.tiles.map(t => t.id) }))),
    });
    this.turnManager.destroy();
  }

  private handleTimeout(): void {
    if (this.phase !== GamePhase.Playing) return;
    const seat = this.turnManager.currentTurn;
    const player = this.players[seat];
    if (player.hand.length > 0) {
      // discard() returns events via flushEvents() — dispatch them so clients
      // actually receive the forced discard and the next game:turn.
      const events = this.discard(seat, player.hand[player.hand.length - 1].id);
      this.eventCallback?.(events);
    }
  }

  getPhase(): GamePhase { return this.phase; }

  getCurrentTurn(): number { return this.turnManager.currentTurn; }

  getPlayerState(seatIndex: number): PlayerState {
    return this.players[seatIndex];
  }

  private emit(event: string, data: any, targets?: number[]): void {
    this.eventQueue.push({ event, data, targets });
  }

  private flushEvents(): GameEvent[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }

  chow(seatIndex: number, tileIds: number[]): GameEvent[] {
    this.eventQueue = [];
    this.clearPendingActions();
    if (!this.lastDiscardedTile) return this.flushEvents();

    const player = this.players[seatIndex];
    const discarded = this.lastDiscardedTile;

    const chowHandTiles = tileIds.map(id => player.hand.find(t => t.id === id)).filter(Boolean) as Tile[];
    if (chowHandTiles.length < 2) {
      this.emit('error', { message: 'Cannot chow - invalid tiles' }, [seatIndex]);
      return this.flushEvents();
    }

    const chowTiles = [...chowHandTiles, discarded];
    player.hand = player.hand.filter(t => !chowHandTiles.includes(t));
    player.melds.push({ type: 'chow', tiles: chowTiles });

    const discarder = this.players[this.lastDiscardSeat];
    discarder.discards.pop();

    this.replayRecorder.record({ type: 'chow', seatIndex, tileIds: chowTiles.map(t => t.id) });
    this.emit('game:action_result', { seatIndex, action: ActionType.Chow, tiles: chowTiles.map(t => t.id), fromSeat: this.lastDiscardSeat });

    this.isAfterKong = false;
    this.turnManager.setTurn(seatIndex);
    this.emit('game:turn', { seatIndex, timeout: 30000 });

    this.lastDiscardedTile = null;
    return this.flushEvents();
  }

  pass(seatIndex: number): GameEvent[] {
    this.eventQueue = [];
    if (!this.pendingActionSeats.has(seatIndex)) {
      return this.flushEvents();
    }
    this.pendingActionSeats.delete(seatIndex);
    if (this.pendingActionSeats.size === 0) {
      if (this.actionTimeout) { clearTimeout(this.actionTimeout); this.actionTimeout = null; }
      this.lastDiscardedTile = null;
      this.advanceToNextPlayer();
    }
    return this.flushEvents();
  }

  private clearPendingActions(): void {
    this.pendingActionSeats.clear();
    if (this.actionTimeout) { clearTimeout(this.actionTimeout); this.actionTimeout = null; }
  }
}
