import { DataSource } from 'typeorm';
import { config } from '../config';
import { User, Room, GameRecord, Friendship, Order, ShopItem } from '../models';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.mysql.host,
  port: config.mysql.port,
  username: config.mysql.username,
  password: config.mysql.password,
  database: config.mysql.database,
  synchronize: true,
  logging: false,
  entities: [User, Room, GameRecord, Friendship, Order, ShopItem],
});

export async function initDatabase(maxRetries = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await AppDataSource.initialize();
      console.log('Database connected');
      return;
    } catch (err) {
      console.error(`Database connection attempt ${attempt}/${maxRetries} failed:`, (err as Error).message);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}
