import Redis from 'ioredis';
import { config } from '../config';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
});

export const ROOM_KEY = (roomId: string) => `room:${roomId}:state`;
export const ROOM_PLAYERS_KEY = (roomId: string) => `room:${roomId}:players`;
export const ONLINE_KEY = (userId: string) => `online:${userId}`;
export const MATCH_QUEUE_KEY = (scoreRange: string) => `match:queue:${scoreRange}`;
