import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import cookie from 'cookie';
import { verifyToken } from './middleware/auth';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  branchId?: string;
}

interface WebSocketMessage {
  type: string;
  data?: any;
}

let io: SocketIOServer | null = null;

export function setupWebSocketServer(server: HTTPServer) {
  io = new SocketIOServer(server, {
    path: '/ws/socket.io',
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Try to get token from cookies first
      const cookieHeader = socket.handshake.headers.cookie;
      let token: string | undefined;

      if (cookieHeader) {
        const cookies = cookie.parse(cookieHeader);
        token = cookies.token;
      }

      // Fallback to auth header or query param
      if (!token) {
        token = socket.handshake.auth.token || socket.handshake.query.token as string;
      }

      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = verifyToken(token);
      
      if (!decoded || !decoded.userId || !decoded.tenantId) {
        console.log('WebSocket connection rejected: Invalid token');
        return next(new Error('Invalid token'));
      }

      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.tenantId = decoded.tenantId;
      socket.branchId = decoded.branchId;

      console.log(`WebSocket authenticated: userId=${socket.userId}, tenantId=${socket.tenantId}, branchId=${socket.branchId}`);
      next();
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`WebSocket connected: userId=${socket.userId}`);

    // Join user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      console.log(`User ${socket.userId} joined room: user:${socket.userId}`);
    }

    // Join tenant-specific room
    if (socket.tenantId) {
      socket.join(`tenant:${socket.tenantId}`);
    }

    // Join branch-specific room
    if (socket.tenantId && socket.branchId) {
      socket.join(`branch:${socket.tenantId}:${socket.branchId}`);
    }

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to VetSystem real-time notifications',
      userId: socket.userId,
    });

    // SECURITY: No arbitrary room joining allowed
    // Rooms are auto-managed based on authenticated user/tenant/branch
    // Clients cannot join other users' rooms

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`WebSocket disconnected: userId=${socket.userId}`);
    });
  });

  console.log('WebSocket server initialized on /ws/socket.io');
  return io;
}

// Broadcast message to all connected clients
export function broadcastWebSocketMessage(message: WebSocketMessage) {
  if (!io) {
    console.warn('WebSocket server not initialized');
    return;
  }

  io.emit(message.type, message.data);
  console.log(`Broadcasted message to all clients: ${message.type}`);
}

// Send message to specific user
export function sendWebSocketMessageToUser(userId: string, message: WebSocketMessage) {
  if (!io) {
    console.warn('WebSocket server not initialized');
    return false;
  }

  io.to(`user:${userId}`).emit(message.type, message.data);
  console.log(`Sent message to userId=${userId}: ${message.type}`);
  return true;
}

// Send message to specific tenant
export function sendWebSocketMessageToTenant(tenantId: string, message: WebSocketMessage) {
  if (!io) {
    console.warn('WebSocket server not initialized');
    return false;
  }

  io.to(`tenant:${tenantId}`).emit(message.type, message.data);
  console.log(`Sent message to tenantId=${tenantId}: ${message.type}`);
  return true;
}

// Send message to specific branch
export function sendWebSocketMessageToBranch(tenantId: string, branchId: string, message: WebSocketMessage) {
  if (!io) {
    console.warn('WebSocket server not initialized');
    return false;
  }

  io.to(`branch:${tenantId}:${branchId}`).emit(message.type, message.data);
  console.log(`Sent message to branchId=${branchId}: ${message.type}`);
  return true;
}

// Get connected clients count
export function getConnectedClientsCount(): number {
  if (!io) {
    return 0;
  }
  return io.sockets.sockets.size;
}

// Get connected users
export function getConnectedUsers(): Array<{ userId: string; tenantId: string; branchId?: string }> {
  if (!io) {
    return [];
  }

  const users: Array<{ userId: string; tenantId: string; branchId?: string }> = [];
  
  io.sockets.sockets.forEach((socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    if (authSocket.userId && authSocket.tenantId) {
      users.push({
        userId: authSocket.userId,
        tenantId: authSocket.tenantId,
        branchId: authSocket.branchId,
      });
    }
  });

  return users;
}
