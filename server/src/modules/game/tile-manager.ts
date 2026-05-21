import { Tile, Suit, TileValue, createFullDeck } from '../../../../shared/constants';

export class TileManager {
  private wall: Tile[] = [];
  private allTiles: Tile[] = [];

  constructor() {
    this.allTiles = createFullDeck();
    this.wall = this.shuffle([...this.allTiles]);
  }

  get wallRemaining(): number {
    return this.wall.length;
  }

  deal(dealerIndex: number): Tile[][] {
    const hands: Tile[][] = [[], [], [], []];
    for (let round = 0; round < 3; round++) {
      for (let seat = 0; seat < 4; seat++) {
        const playerIdx = (dealerIndex + seat) % 4;
        for (let i = 0; i < 4; i++) {
          hands[playerIdx].push(this.wall.shift()!);
        }
      }
    }
    for (let seat = 0; seat < 4; seat++) {
      const playerIdx = (dealerIndex + seat) % 4;
      hands[playerIdx].push(this.wall.shift()!);
    }
    hands[dealerIndex].push(this.wall.shift()!);
    return hands;
  }

  drawFromWall(): Tile | null {
    if (this.wall.length === 0) return null;
    return this.wall.shift()!;
  }

  drawFromEnd(): Tile | null {
    if (this.wall.length === 0) return null;
    return this.wall.pop()!;
  }

  getTileById(id: number): Tile | undefined {
    return this.allTiles.find(t => t.id === id);
  }

  getTilesByIds(ids: number[]): Tile[] {
    return ids.map(id => this.getTileById(id)!).filter(Boolean);
  }

  private shuffle(tiles: Tile[]): Tile[] {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    return tiles;
  }
}
