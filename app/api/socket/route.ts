import { NextResponse } from 'next/server';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from '@/lib/db';
import Consultation from '@/models/Consultation';
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
      socket.on('webrtc:join-room', async (roomId: string) => {
        await connectDB();
        const consultation = await Consultation.findOne({
          recordingMetadata: roomId,
          status: 'active',
          $or: [{ ownerId: socket.data.userId }, { vetId: socket.data.userId }],
        });
        if (!consultation) return socket.emit('webrtc:error', 'Consultation access denied');
        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.to(roomId).emit('webrtc:user-joined');
      });
      socket.on('webrtc:offer', data => socket.to(data.roomId).emit('webrtc:offer', data.offer));
      socket.on('webrtc:answer', data => socket.to(data.roomId).emit('webrtc:answer', data.answer));
      socket.on('webrtc:ice-candidate', data => socket.to(data.roomId).emit('webrtc:ice-candidate', data.candidate));
      socket.on('consultation:chat', data => {
        if (socket.data.roomId === data.roomId && typeof data.text === 'string' && data.text.length <= 1000) {
          socket.to(data.roomId).emit('consultation:chat', { text: data.text, senderId: socket.data.userId, sentAt: new Date().toISOString() });
        }
      });
      socket.on('disconnect', () => {
        if (socket.data.roomId) socket.to(socket.data.roomId).emit('webrtc:user-left');
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
