import { TileManager } from '../tile-manager';
import { Suit } from '../../../../../shared/constants';

describe('TileManager', () => {
  let tm: TileManager;

  beforeEach(() => {
    tm = new TileManager();
  });

  it('should deal correct hand sizes', () => {
    const hands = tm.deal(0);
    expect(hands[0].length).toBe(14); // dealer
    expect(hands[1].length).toBe(13);
    expect(hands[2].length).toBe(13);
    expect(hands[3].length).toBe(13);
  });

  it('should deal 52 tiles total (13*3+14)', () => {
    const hands = tm.deal(0);
    const totalDealt = hands.reduce((sum, h) => sum + h.length, 0);
    expect(totalDealt).toBe(53); // 13*3 + 14
  });

  it('should have remaining wall after dealing', () => {
    tm.deal(0);
    expect(tm.wallRemaining).toBe(55); // 108 - 53
  });

  it('should draw from wall', () => {
    tm.deal(0);
    const initialWall = tm.wallRemaining;
    const tile = tm.drawFromWall();
    expect(tile).toBeDefined();
    expect(tm.wallRemaining).toBe(initialWall - 1);
  });

  it('should return null when wall is empty', () => {
    tm.deal(0);
    while (tm.wallRemaining > 0) tm.drawFromWall();
    expect(tm.drawFromWall()).toBeNull();
  });

  it('should get tile by id', () => {
    const tile = tm.getTileById(0);
    expect(tile).toBeDefined();
    expect(tile!.suit).toBe(Suit.Wan);
    expect(tile!.value).toBe(1);
  });

  it('should shuffle tiles randomly', () => {
    const hands1 = new TileManager().deal(0);
    const hands2 = new TileManager().deal(0);
    const same = JSON.stringify(hands1) === JSON.stringify(hands2);
    expect(same).toBe(false);
  });

  it('should draw from end', () => {
    tm.deal(0);
    const tile = tm.drawFromEnd();
    expect(tile).toBeDefined();
  });
});
