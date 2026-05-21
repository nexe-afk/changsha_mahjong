import { Server, Socket } from 'socket.io';
import { GameEngine } from '../game/engine';
import { AIPlayer } from '../game/ai-player';
import { WinDetector } from '../game/win-detector';
import { redis, ROOM_KEY, ROOM_PLAYERS_KEY, ONLINE_KEY } from '../../utils/redis';

interface RoomState {
  roomId: string;
  playerIds: string[];
  playerSockets: Map<string, string>;
  engine: GameEngine | null;
  baseScore: number;
  aiSeats: Set<number>;
  pendingPrompts: Map<number, any[]>;
}

export class RoomService {
  private rooms = new Map<string, RoomState>();
  private playerRooms = new Map<string, string>();
  private cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private aiTimers = new Map<string, ReturnType<typeof setTimeout>[]>();

  constructor(private io: Server) {}

  async createRoom(socket: Socket, userId: string, roomType: string): Promise<string> {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room: RoomState = {
      roomId,
      playerIds: [userId],
      playerSockets: new Map([[userId, socket.id]]),
      engine: null,
      baseScore: 10,
      aiSeats: new Set(),
      pendingPrompts: new Map(),
    };
    this.rooms.set(roomId, room);
    this.playerRooms.set(userId, roomId);
    socket.join(roomId);
    socket.data.roomId = roomId;

    await redis.set(ROOM_KEY(roomId), JSON.stringify({ roomId, roomType, baseScore: 10 }));
    await redis.sadd(ROOM_PLAYERS_KEY(roomId), userId);
    await redis.set(ONLINE_KEY(userId), socket.id);

    return roomId;
  }

  async joinRoom(socket: Socket, userId: string, roomId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room || room.playerIds.length >= 4) return false;

    room.playerIds.push(userId);
    room.playerSockets.set(userId, socket.id);
    this.playerRooms.set(userId, roomId);
    socket.join(roomId);
    socket.data.roomId = roomId;
    await redis.set(ONLINE_KEY(userId), socket.id);

    this.broadcastRoomState(roomId);

    if (room.playerIds.length === 4) {
      this.startGame(roomId);
    }
    return true;
  }

  async quickMatch(socket: Socket, userId: string): Promise<string | null> {
    for (const [roomId, room] of this.rooms) {
      if (room.playerIds.length < 4 && !room.engine && room.aiSeats.size === 0) {
        const joined = await this.joinRoom(socket, userId, roomId);
        return joined ? roomId : null;
      }
    }
    return this.createRoom(socket, userId, 'match');
  }

  async createAIRoom(socket: Socket, userId: string): Promise<string> {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const aiIds = ['ai_1', 'ai_2', 'ai_3'].map(s => `${s}_${Date.now()}`);

    const room: RoomState = {
      roomId,
      playerIds: [userId, ...aiIds],
      playerSockets: new Map([[userId, socket.id]]),
      engine: null,
      baseScore: 10,
      aiSeats: new Set([1, 2, 3]),
      pendingPrompts: new Map(),
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(userId, roomId);
    socket.join(roomId);
    socket.data.roomId = roomId;

    await redis.set(ROOM_KEY(roomId), JSON.stringify({ roomId, roomType: 'ai', baseScore: 10 }));
    await redis.set(ONLINE_KEY(userId), socket.id);

    this.broadcastRoomState(roomId);

    setTimeout(() => this.startGame(roomId), 2000);

    return roomId;
  }

  private startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.playerIds.length !== 4) return;

    // 长沙麻将定庄：掷两颗骰子，从骰子点数确定庄家
    // 从座位0开始，逆时针数骰子和，落到谁谁就是庄
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const sum = dice1 + dice2;
    const dealerIndex = (sum - 1) % 4;

    room.engine = new GameEngine(room.playerIds, dealerIndex);
    // Wire up the engine's timeout callbacks so their events reach clients.
    // Without this, actionTimeout and handleTimeout emit events that are never
    // returned to any caller and therefore never dispatched.
    room.engine.setEventCallback((events) => {
      this.dispatchGameEvents(roomId, events);
    });

    // 先发送骰子信息
    this.io.to(roomId).emit('game:dice', { dice1, dice2, sum, dealerIndex });

    const events = room.engine.start();
    console.log(`[Room ${roomId}] Game started, dealer=${dealerIndex} (dice: ${dice1}+${dice2}=${sum}), events=${events.length}`);
    this.dispatchGameEvents(roomId, events);
  }

  private clearAiTimers(roomId: string): void {
    const timers = this.aiTimers.get(roomId);
    if (timers) {
      timers.forEach(t => clearTimeout(t));
      this.aiTimers.delete(roomId);
    }
  }

  private addAiTimer(roomId: string, timer: ReturnType<typeof setTimeout>): void {
    let timers = this.aiTimers.get(roomId);
    if (!timers) {
      timers = [];
      this.aiTimers.set(roomId, timers);
    }
    timers.push(timer);
  }

  private scheduleAiDiscard(roomId: string, seatIndex: number): void {
    const delay = 800 + Math.random() * 700;
    const timer = setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (!room?.engine) return;
      const phase = room.engine.getPhase();
      if (phase !== 'playing' && phase !== 'sea_roaming') return;
      // Guard: another player may have ponged/chowed and taken the turn.
      if (room.engine.getCurrentTurn() !== seatIndex) return;
      // Guard: a human player is still deciding on an action prompt.
      // Don't advance the game until the action window resolves.
      if (room.pendingPrompts.size > 0) return;

      const player = room.engine.getPlayerState(seatIndex);
      if (!player || player.hand.length === 0) return;

      const tile = AIPlayer.chooseDiscard(player.hand);
      console.log(`[Room ${roomId}] AI seat ${seatIndex} discards tile ${tile.id}`);
      const events = room.engine.discard(seatIndex, tile.id);
      this.dispatchGameEvents(roomId, events);
    }, delay);
    this.addAiTimer(roomId, timer);
  }

  private scheduleAiAction(roomId: string, seatIndex: number, actions: any[]): void {
    const timer = setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (!room?.engine) return;
      if (room.engine.getPhase() === 'finished') return;

      const winAction = actions.find((a: any) => a.type === 'win' || a.type === 'Win');
      if (winAction) {
        console.log(`[Room ${roomId}] AI seat ${seatIndex} wins`);
        const events = room.engine.win(seatIndex);
        this.dispatchGameEvents(roomId, events);
        return;
      }

      const kongAction = actions.find((a: any) => a.type === 'kong' || a.type === 'Kong');
      if (kongAction) {
        console.log(`[Room ${roomId}] AI seat ${seatIndex} kongs`);
        const events = room.engine.kong(seatIndex, kongAction.tileId || 0, kongAction.kongType || 'ming');
        this.dispatchGameEvents(roomId, events);
        return;
      }

      const pongAction = actions.find((a: any) => a.type === 'pong' || a.type === 'Pong');
      if (pongAction && Math.random() > 0.3) {
        console.log(`[Room ${roomId}] AI seat ${seatIndex} pongs`);
        const events = room.engine.pong(seatIndex);
        this.dispatchGameEvents(roomId, events);
        return;
      }

      const chowAction = actions.find((a: any) => a.type === 'chow' || a.type === 'Chow');
      if (chowAction && Math.random() > 0.5) {
        const options = chowAction.options;
        if (options && options.length > 0) {
          const chosen = options[Math.floor(Math.random() * options.length)];
          const tileIds = chosen.tiles.filter((t: any) => t.id !== undefined).map((t: any) => t.id);
          if (tileIds.length >= 2) {
            console.log(`[Room ${roomId}] AI seat ${seatIndex} chows`);
            const events = room.engine.chow(seatIndex, tileIds);
            this.dispatchGameEvents(roomId, events);
            return;
          }
        }
      }

      console.log(`[Room ${roomId}] AI seat ${seatIndex} passes`);
      const events = room.engine.pass(seatIndex);
      this.dispatchGameEvents(roomId, events);
    }, 400 + Math.random() * 400);
    this.addAiTimer(roomId, timer);
  }

  private scheduleAiSelfDrawCheck(roomId: string, seatIndex: number): void {
    const timer = setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (!room?.engine) return;
      const phase = room.engine.getPhase();
      if (phase !== 'playing' && phase !== 'sea_roaming') return;

      const player = room.engine.getPlayerState(seatIndex);
      if (!player) return;

      const canWin = WinDetector.checkBasicWin(player.hand, false).canWin
        || WinDetector.isQiXiaoDui(player.hand)
        || WinDetector.isPengPengHu(player.hand)
        || WinDetector.isJiangJiangHu(player.hand);

      if (canWin) {
        console.log(`[Room ${roomId}] AI seat ${seatIndex} self-draw wins`);
        this.clearAiTimers(roomId);
        const events = room.engine.win(seatIndex);
        this.dispatchGameEvents(roomId, events);
      }
    }, 500);
    this.addAiTimer(roomId, timer);
  }

  handleAutoPlay(roomId: string, userId: string, enable: boolean): void {
    const room = this.rooms.get(roomId);
    if (!room?.engine) return;

    const seatIndex = room.playerIds.indexOf(userId);
    if (seatIndex === -1) return;

    if (enable) {
      room.aiSeats.add(seatIndex);
      console.log(`[Room ${roomId}] Seat ${seatIndex} enabled auto-play`);

      const phase = room.engine.getPhase();
      if (phase !== 'playing' && phase !== 'sea_roaming') return;

      // Case 1: there is a pending action prompt (pong/win/chow/kong waiting)
      const pending = room.pendingPrompts.get(seatIndex);
      if (pending && pending.length > 0) {
        room.pendingPrompts.delete(seatIndex);
        this.scheduleAiAction(roomId, seatIndex, pending);
        return;
      }

      // Case 2: it is this player's turn to discard
      const currentTurn = room.engine.getCurrentTurn();
      if (currentTurn === seatIndex) {
        const player = room.engine.getPlayerState(seatIndex);
        // Check self-draw win first; if not, discard
        if (player && player.hand.length > 0) {
          const meldTiles = player.melds.flatMap((m: any) => m.tiles);
          const canWin = WinDetector.checkBasicWin(player.hand, false).canWin
            || WinDetector.checkBasicWin(player.hand, true).canWin
            || (meldTiles.length === 0 && WinDetector.isQiXiaoDui(player.hand))
            || WinDetector.isPengPengHu(player.hand, meldTiles)
            || WinDetector.isJiangJiangHu(player.hand, meldTiles);
          if (canWin) {
            this.scheduleAiAction(roomId, seatIndex, [{ type: 'win' }]);
          } else {
            this.scheduleAiDiscard(roomId, seatIndex);
          }
        }
      }
      // Case 3: another player's turn — game will route correctly once
      // dispatchGameEvents sees seatIndex in aiSeats on the next event
    } else {
      room.aiSeats.delete(seatIndex);
      console.log(`[Room ${roomId}] Seat ${seatIndex} cancelled auto-play`);
    }
  }

  handleGameAction(roomId: string, userId: string, action: string, data: any): void {
    const room = this.rooms.get(roomId);
    if (!room?.engine) return;

    const seatIndex = room.playerIds.indexOf(userId);
    if (seatIndex === -1) return;

    const phase = room.engine.getPhase();
    if (phase !== 'playing' && phase !== 'sea_roaming') return;

    if (action === 'game:discard') {
      if (room.engine.getCurrentTurn() !== seatIndex) return;
    }

    console.log(`[Room ${roomId}] Player seat ${seatIndex} action: ${action}`);

    let events: any[] = [];
    switch (action) {
      case 'game:discard':
        events = room.engine.discard(seatIndex, data.tileId);
        break;
      case 'game:pong':
        events = room.engine.pong(seatIndex);
        break;
      case 'game:chow':
        events = room.engine.chow(seatIndex, data.tileIds || []);
        break;
      case 'game:kong':
        events = room.engine.kong(seatIndex, data.tileId, data.kongType);
        break;
      case 'game:win':
        events = room.engine.win(seatIndex);
        break;
      case 'game:pass':
        events = room.engine.pass(seatIndex);
        break;
    }

    this.dispatchGameEvents(roomId, events);
  }

  private dispatchGameEvents(roomId: string, events: any[]): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const evt of events) {
      const targets = evt.targets && evt.targets.length > 0 ? evt.targets : null;

      if (targets) {
        for (const seatIdx of targets) {
          if (room.aiSeats.has(seatIdx)) {
            if (evt.event === 'game:action_prompt') {
              this.scheduleAiAction(roomId, seatIdx, evt.data.actions || []);
              // Don't forward action prompts to the client in auto-play mode
              continue;
            }
            // For non-prompt events (e.g. game:tile_drawn), still forward to
            // human players who are in auto-play so their hand display stays in sync
            const humanSocket = room.playerSockets.get(room.playerIds[seatIdx]);
            if (humanSocket) {
              this.io.to(humanSocket).emit(evt.event, evt.data);
            }
            continue;
          }
          const socketId = room.playerSockets.get(room.playerIds[seatIdx]);
          if (socketId) {
            this.io.to(socketId).emit(evt.event, evt.data);
            if (evt.event === 'game:action_prompt') {
              room.pendingPrompts.set(seatIdx, evt.data.actions || []);
            }
          }
        }
      } else {
        this.io.to(roomId).emit(evt.event, evt.data);
      }

      // A new turn starting means the action window is over.
      // Clear any stale human-player pending prompts (e.g. left over from a
      // human pressing "pass" — pass() doesn't emit game:action_result so
      // the prompt map would otherwise stay non-empty and block AI discards).
      if (evt.event === 'game:turn') {
        room.pendingPrompts.clear();
      }

      if (evt.event === 'game:turn' && room.aiSeats.has(evt.data?.seatIndex)) {
        const aiSeat = evt.data.seatIndex as number;
        // Check self-draw win before scheduling a blind discard
        const player = room.engine?.getPlayerState(aiSeat);
        if (player && player.hand.length > 0) {
          const meldTiles = player.melds.flatMap((m: any) => m.tiles);
          const canWin = WinDetector.checkBasicWin(player.hand, false).canWin
            || WinDetector.checkBasicWin(player.hand, true).canWin
            || (meldTiles.length === 0 && WinDetector.isQiXiaoDui(player.hand))
            || WinDetector.isPengPengHu(player.hand, meldTiles)
            || WinDetector.isJiangJiangHu(player.hand, meldTiles);
          if (canWin) {
            this.scheduleAiAction(roomId, aiSeat, [{ type: 'win' }]);
          } else {
            this.scheduleAiDiscard(roomId, aiSeat);
          }
        } else {
          this.scheduleAiDiscard(roomId, aiSeat);
        }
      }

      if (evt.event === 'game:action_result') {
        this.clearAiTimers(roomId);
        room.pendingPrompts.clear();
      }

      if (evt.event === 'game:result') {
        this.clearAiTimers(roomId);
        this.scheduleCleanup(roomId);
      }
    }
  }

  private scheduleCleanup(roomId: string): void {
    const existing = this.cleanupTimers.get(roomId);
    if (existing) clearTimeout(existing);

    this.cleanupTimers.set(roomId, setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (!room) return;

      for (const pid of room.playerIds) {
        this.playerRooms.delete(pid);
      }

      this.disconnectTimers.forEach((timer, userId) => {
        if (room.playerIds.includes(userId)) {
          clearTimeout(timer);
          this.disconnectTimers.delete(userId);
        }
      });

      this.rooms.delete(roomId);
      this.cleanupTimers.delete(roomId);
    }, 300000));
  }

  private broadcastRoomState(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const aiNicknames = ['AI-小红', 'AI-小明', 'AI-小刚'];
    this.io.to(roomId).emit('room:state', {
      roomId: room.roomId,
      players: room.playerIds.map((pid, i) => ({
        seatIndex: i,
        userId: pid,
        nickname: pid.startsWith('ai_') ? aiNicknames[i - 1] || pid : pid,
        avatar: '',
        ready: true,
        isOnline: !pid.startsWith('ai_'),
      })),
      roomType: room.aiSeats.size > 0 ? 'ai' : 'match',
      baseScore: room.baseScore,
    });
  }

  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  handleDisconnect(socket: Socket, userId: string): void {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const seatIndex = room.playerIds.indexOf(userId);
    if (seatIndex === -1) return;

    room.playerSockets.delete(userId);
    this.io.to(roomId).emit('room:state', {
      roomId: room.roomId,
      players: room.playerIds.map((pid, i) => ({
        seatIndex: i,
        userId: pid,
        nickname: pid,
        avatar: '',
        ready: true,
        isOnline: room.playerSockets.has(pid),
      })),
      roomType: 'match',
      baseScore: room.baseScore,
    });

    if (room.engine) {
      const existing = this.disconnectTimers.get(userId);
      if (existing) clearTimeout(existing);

      this.disconnectTimers.set(userId, setTimeout(() => {
        if (room.engine && !room.playerSockets.has(userId)) {
          room.engine.getPlayerState(seatIndex).isOnline = false;
          this.disconnectTimers.delete(userId);
        }
      }, 60000));
    }
  }
}
