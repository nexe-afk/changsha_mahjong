import { TurnManager } from '../turn-manager';

describe('TurnManager', () => {
  it('should start with dealer turn', () => {
    const tm = new TurnManager(0, 30000);
    expect(tm.currentTurn).toBe(0);
  });

  it('should advance to next player', () => {
    const tm = new TurnManager(0, 30000);
    tm.nextTurn();
    expect(tm.currentTurn).toBe(1);
  });

  it('should wrap around after seat 3', () => {
    const tm = new TurnManager(3, 30000);
    tm.nextTurn();
    expect(tm.currentTurn).toBe(0);
  });

  it('should track turns correctly', () => {
    const tm = new TurnManager(0, 30000);
    expect(tm.turnCount).toBe(0);
    tm.nextTurn();
    expect(tm.turnCount).toBe(1);
  });

  it('should detect first turn', () => {
    const tm = new TurnManager(0, 30000);
    expect(tm.isFirstTurn).toBe(true);
    tm.nextTurn();
    expect(tm.isFirstTurn).toBe(false);
  });
});
