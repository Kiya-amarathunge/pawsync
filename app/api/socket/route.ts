/**
 * PawSync API route: /api/socket
 *
 * Domain: realtime Socket.IO initialization.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextResponse } from 'next/server';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyToken } from '@/lib/jwt';

declare global {
  var socketIO: SocketIOServer | undefined;
  var onlineUsers: Map<string, number> | undefined;
}

export async function GET() {
  if (!global.socketIO) {
    const httpServer = createServer();
    const io = new SocketIOServer(httpServer, {
      cors: { origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
    });
    io.use((socket, next) => {
      const token = typeof socket.handshake.auth.token === 'string' ? socket.handshake.auth.token : '';
      const user = verifyToken(token);
      if (!user?.userId) return next(new Error('Unauthorized'));
      socket.data.userId = user.userId;
      next();
    });
    io.on('connection', socket => {
      const userId = String(socket.data.userId);
      global.onlineUsers ||= new Map<string, number>();
      global.onlineUsers.set(userId, (global.onlineUsers.get(userId) || 0) + 1);
      socket.join(userId);
      io.emit('presence:update', { userId, online: true });
      socket.on('presence:check', (targetUserId: string) => {
        socket.emit('presence:update', { userId: targetUserId, online: (global.onlineUsers?.get(targetUserId) || 0) > 0 });
      });
      socket.on('message:send', data => {
        if (String(data.senderId) === userId && data.receiverId) io.to(String(data.receiverId)).emit('message:receive', data);
      });
      socket.on('message:read', data => {
        if (String(data.readerId) === userId && data.senderId) io.to(String(data.senderId)).emit('message:read', data);
      });
      socket.on('user:typing', data => {
        if (String(data.senderId) === userId && data.receiverId) io.to(String(data.receiverId)).emit('user:typing', data);
      });
      socket.on('disconnect', () => {
        const remaining = Math.max(0, (global.onlineUsers?.get(userId) || 1) - 1);
        if (remaining === 0) {
          global.onlineUsers?.delete(userId);
          io.emit('presence:update', { userId, online: false });
        } else {
          global.onlineUsers?.set(userId, remaining);
        }
      });
    });
    const port = Number(process.env.SIGNALING_PORT) || 3001;
    httpServer.listen(port);
    global.socketIO = io;
  }
  return NextResponse.json({ message: 'Signaling server is ready', port: Number(process.env.SIGNALING_PORT) || 3001 });
}
