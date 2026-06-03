import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

// Store io instance globally so it persists across requests
let io: SocketIOServer;

declare global {
  var socketIO: SocketIOServer | undefined;
}

export async function GET(req: NextRequest) {
  if (!global.socketIO) {
    console.log('Starting Socket.io server...');

    const httpServer = createServer();

    global.socketIO = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    global.socketIO.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join a personal room using userId
      socket.on('join', (userId: string) => {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
      });

      // --- CHAT EVENTS ---
      socket.on('message:send', (data: {
        senderId: string;
        receiverId: string;
        content: string;
        messageId: string;
      }) => {
        // Send message to receiver's room instantly
        global.socketIO?.to(data.receiverId).emit('message:receive', data);
      });

      socket.on('message:read', (data: {
        messageId: string;
        senderId: string;
        receiverId: string;
      }) => {
        global.socketIO?.to(data.senderId).emit('message:read', data);
      });

      socket.on('user:typing', (data: {
        senderId: string;
        receiverId: string;
        isTyping: boolean;
      }) => {
        global.socketIO?.to(data.receiverId).emit('user:typing', data);
      });

      // --- WEBRTC SIGNALLING EVENTS ---
      socket.on('webrtc:join-room', (roomId: string, userId: string) => {
        socket.join(roomId);
        socket.to(roomId).emit('webrtc:user-joined', userId);
        console.log(`User ${userId} joined WebRTC room ${roomId}`);
      });

      socket.on('webrtc:offer', (data: {
        roomId: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        socket.to(data.roomId).emit('webrtc:offer', data.offer);
      });

      socket.on('webrtc:answer', (data: {
        roomId: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        socket.to(data.roomId).emit('webrtc:answer', data.answer);
      });

      socket.on('webrtc:ice-candidate', (data: {
        roomId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        socket.to(data.roomId).emit('webrtc:ice-candidate', data.candidate);
      });

      socket.on('webrtc:leave-room', (roomId: string, userId: string) => {
        socket.to(roomId).emit('webrtc:user-left', userId);
        socket.leave(roomId);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    httpServer.listen(3001, () => {
      console.log('Socket.io server running on port 3001');
    });
  }

  return NextResponse.json({ message: 'Socket.io server is running', port: 3001 });
}
