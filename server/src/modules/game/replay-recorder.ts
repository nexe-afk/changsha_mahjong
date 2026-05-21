export interface GameAction {
  type: string;
  seatIndex: number;
  tileIds?: number[];
  timestamp: number;
}

export class ReplayRecorder {
  private actions: GameAction[] = [];

  record(action: Omit<GameAction, 'timestamp'>): void {
    this.actions.push({ ...action, timestamp: Date.now() });
  }

  getActions(): GameAction[] {
    return [...this.actions];
  }

  toJSON(): object {
    return { actions: this.actions };
  }
}
