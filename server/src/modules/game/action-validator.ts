import { Tile, Suit } from '../../../../shared/constants';

export interface ChowOption {
  tiles: Tile[];
  type: 'left' | 'middle' | 'right';
}

export class ActionValidator {

  static canChow(hand: Tile[], discardedTile: Tile): boolean {
    return ActionValidator.getChowOptions(hand, discardedTile).length > 0;
  }

  static getChowOptions(hand: Tile[], discardedTile: Tile): ChowOption[] {
    const options: ChowOption[] = [];
    const { suit, value } = discardedTile;

    const hasInHand = (v: number) => hand.some(t => t.suit === suit && t.value === v);
    const getTiles = (values: number[]) => values.map(v => hand.find(t => t.suit === suit && t.value === v)!).filter(Boolean);

    if (value >= 3 && hasInHand(value - 2) && hasInHand(value - 1)) {
      options.push({ tiles: [...getTiles([value - 2, value - 1]), discardedTile], type: 'left' });
    }
    if (value >= 2 && value <= 8 && hasInHand(value - 1) && hasInHand(value + 1)) {
      options.push({ tiles: [...getTiles([value - 1, value + 1]), discardedTile], type: 'middle' });
    }
    if (value <= 7 && hasInHand(value + 1) && hasInHand(value + 2)) {
      options.push({ tiles: [...getTiles([value + 1, value + 2]), discardedTile], type: 'right' });
    }
    return options;
  }

  static canPong(hand: Tile[], discardedTile: Tile): boolean {
    const count = hand.filter(t => t.suit === discardedTile.suit && t.value === discardedTile.value).length;
    return count >= 2;
  }

  static canMingKong(hand: Tile[], discardedTile: Tile): boolean {
    const count = hand.filter(t => t.suit === discardedTile.suit && t.value === discardedTile.value).length;
    return count >= 3;
  }

  static canAngKong(hand: Tile[]): Tile[] {
    const counts = new Map<string, { tile: Tile; count: number }>();
    for (const t of hand) {
      const key = `${t.suit}-${t.value}`;
      const existing = counts.get(key);
      if (existing) existing.count++;
      else counts.set(key, { tile: t, count: 1 });
    }
    const result: Tile[] = [];
    for (const { tile, count } of counts.values()) {
      if (count === 4) result.push(tile);
    }
    return result;
  }

  static canJiaKong(hand: Tile[], pongedTiles: Tile[]): Tile[] {
    const result: Tile[] = [];
    for (const pt of pongedTiles) {
      if (hand.some(t => t.suit === pt.suit && t.value === pt.value)) {
        result.push(pt);
      }
    }
    return result;
  }
}
