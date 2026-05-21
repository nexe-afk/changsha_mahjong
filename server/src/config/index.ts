import dotenv from 'dotenv';
import type { StringValue } from 'ms';

dotenv.config();

const requiredEnvVars = ['JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Missing required environment variable ${envVar}`);
    process.exit(1);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpire: (process.env.JWT_EXPIRE || '7d') as StringValue,
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'changsha_mahjong',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  game: {
    turnTimeout: 30000,
    reconnectTimeout: 60000,
    baseScoreSmall: 10,
    baseScoreBig: 30,
    dealerBonus: 10,
    birdCount: 2,
  },
};
