export class TurnManager {
  private _currentTurn: number;
  private _turnCount = 0;
  private _timeoutMs: number;
  private _timeoutHandle: NodeJS.Timeout | null = null;
  private _onTimeout: (() => void) | null = null;

  constructor(dealerIndex: number, timeoutMs: number) {
    this._currentTurn = dealerIndex;
    this._timeoutMs = timeoutMs;
  }

  get currentTurn(): number { return this._currentTurn; }
  get turnCount(): number { return this._turnCount; }
  get isFirstTurn(): boolean { return this._turnCount === 0; }

  nextTurn(): void {
    this._currentTurn = (this._currentTurn + 1) % 4;
    this._turnCount++;
    this.resetTimeout();
  }

  setTurn(seatIndex: number): void {
    this._currentTurn = seatIndex;
    this.resetTimeout();
  }

  setTimeoutCallback(callback: () => void): void {
    this._onTimeout = callback;
  }

  resetTimeout(): void {
    this.clearTimeout();
    if (this._onTimeout) {
      this._timeoutHandle = setTimeout(() => {
        this._onTimeout?.();
      }, this._timeoutMs);
    }
  }

  clearTimeout(): void {
    if (this._timeoutHandle) {
      clearTimeout(this._timeoutHandle);
      this._timeoutHandle = null;
    }
  }

  get nextSeat(): number {
    return (this._currentTurn + 1) % 4;
  }

  isNextPlayer(seatIndex: number, fromSeat: number): boolean {
    return seatIndex === (fromSeat + 1) % 4;
  }

  destroy(): void {
    this.clearTimeout();
  }
}
