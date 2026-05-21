import { User } from '../User';
import { Room } from '../Room';
import { GameRecord } from '../GameRecord';

describe('Models', () => {
  it('User model should have correct properties', () => {
    const user = new User();
    user.username = 'test';
    user.passwordHash = 'hash123';
    user.nickname = 'TestUser';
    expect(user.username).toBe('test');
    expect(user.coins).toBe(10000);
    expect(user.level).toBe(1);
    expect(user.winCount).toBe(0);
  });

  it('Room model should accept player slots', () => {
    const room = new Room();
    room.roomNumber = '123456';
    room.roomType = 'match';
    room.player0Id = 1;
    room.player1Id = null;
    room.player2Id = null;
    room.player3Id = null;
    expect(room.roomNumber).toBe('123456');
    expect(room.player0Id).toBe(1);
    expect(room.player1Id).toBeNull();
  });

  it('GameRecord should store JSON data', () => {
    const record = new GameRecord();
    record.initialHands = { 0: [1, 2, 3] };
    record.actions = [{ type: 'discard', tile: 1 }];
    record.result = { winner: 0 };
    expect(record.initialHands).toEqual({ 0: [1, 2, 3] });
  });
});
