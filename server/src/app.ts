import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initDatabase } from './utils/database';
import authRoutes from './modules/auth/auth.routes';
import shopRoutes from './modules/shop/shop.routes';
import rankingRoutes from './modules/ranking/ranking.routes';
import friendRoutes from './modules/friend/friend.routes';
import { setupGameSocket } from './modules/room/room.socket';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);

app.use(cors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : undefined));
app.use(express.json());

const apiLimiter = rateLimit({ windowMs: 60_000, max: 100, message: { error: '请求过于频繁，请稍后再试' } });
app.use('/api/', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/friend', friendRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const io = new Server(httpServer, {
  cors: allowedOrigins.length > 0 ? { origin: allowedOrigins, methods: ['GET', 'POST'] } : { origin: '*', methods: ['GET', 'POST'] },
});

setupGameSocket(io);

async function bootstrap() {
  await initDatabase();
  httpServer.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

bootstrap();

export { app, io };
