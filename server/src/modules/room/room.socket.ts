import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

export function setupGameSocket(io: Server): void {
  const roomService = new RoomService(io);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: number };
      socket.data.userId = decoded.userId.toString();
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User ${userId} connected via socket`);

    socket.on('room:join', async (data) => {
      try {
        if (data.roomId) {
          const joined = await roomService.joinRoom(socket, userId, data.roomId);
          if (!joined) socket.emit('error', { message: 'Room not found or full' });
        } else {
          const roomId = await roomService.quickMatch(socket, userId);
          socket.emit('room:state', { roomId });
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('room:joinAI', async () => {
      try {
        const roomId = await roomService.createAIRoom(socket, userId);
        socket.emit('room:state', { roomId });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('room:ready', () => {
      roomService.handleGameAction(socket.data.roomId || '', userId, 'room:ready', {});
    });

    socket.on('game:discard', (data) => {
      roomService.handleGameAction(socket.data.roomId || '', userId, 'game:discard', data);
    });

    socket.on('game:pong', () => {
      roomService.handleGameAction(socket.data.roomId || '', userId, 'game:pong', {});
    });

    socket.on('game:kong', (data) => {
      roomService.handleGameAction(socket.data.roomId || '', userId, 'game:kong', data);
    });

    socket.on('game:chow', (data) => {
      roomService.handleGameAction(socket.data.roomId || '', userId, 'game:chow', data);
    });

    socket.on('game:win', () => {
      roomService.handleGameAction(socket.data.roomId || '', userId, 'game:win', {});
    });

    socket.on('game:pass', () => {
      roomService.handleGameAction(socket.data.roomId || '', userId, 'game:pass', {});
    });

    socket.on('game:autoPlay', () => {
      roomService.handleAutoPlay(socket.data.roomId || '', userId, true);
    });

    socket.on('game:cancelAutoPlay', () => {
      roomService.handleAutoPlay(socket.data.roomId || '', userId, false);
    });

    socket.on('disconnect', () => {
      roomService.handleDisconnect(socket, userId);
    });
  });
}
