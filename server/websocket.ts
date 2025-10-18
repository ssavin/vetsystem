import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyToken } from './middleware/auth';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  tenantId?: string;
  branchId?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: string;
  data?: any;
}

const clients = new Set<AuthenticatedWebSocket>();

export function setupWebSocketServer(server: any) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    console.log('WebSocket connection attempt');

    // Extract token from query params or headers
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || req.headers['sec-websocket-protocol'];

    if (!token) {
      console.log('WebSocket connection rejected: No token provided');
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      // Verify JWT token
      const decoded = verifyToken(token);
      
      if (!decoded || !decoded.userId || !decoded.tenantId) {
        console.log('WebSocket connection rejected: Invalid token');
        ws.close(1008, 'Invalid token');
        return;
      }

      // Attach user info to WebSocket
      ws.userId = decoded.userId;
      ws.tenantId = decoded.tenantId;
      ws.branchId = decoded.branchId;
      ws.isAlive = true;

      clients.add(ws);
      console.log(`WebSocket authenticated: userId=${ws.userId}, tenantId=${ws.tenantId}, branchId=${ws.branchId}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to VetSystem real-time notifications'
      }));

      // Handle incoming messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('WebSocket message received:', data);

          // Handle ping-pong for connection keepalive
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle pong responses
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle disconnection
      ws.on('close', () => {
        clients.delete(ws);
        console.log(`WebSocket disconnected: userId=${ws.userId}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
      });

    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(1008, 'Authentication failed');
    }
  });

  // Setup heartbeat to detect broken connections
  const heartbeatInterval = setInterval(() => {
    clients.forEach((ws) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // Check every 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('WebSocket server initialized on /ws');
  return wss;
}

// Broadcast message to all connected clients
export function broadcastWebSocketMessage(message: WebSocketMessage) {
  const payload = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
  
  console.log(`Broadcasted message to ${clients.size} clients:`, message.type);
}

// Send message to specific user
export function sendWebSocketMessageToUser(userId: string, message: WebSocketMessage) {
  const payload = JSON.stringify(message);
  let sent = 0;
  
  clients.forEach((client) => {
    if (client.userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(payload);
      sent++;
    }
  });
  
  console.log(`Sent message to ${sent} connections for userId=${userId}:`, message.type);
  return sent > 0;
}

// Send message to specific tenant
export function sendWebSocketMessageToTenant(tenantId: string, message: WebSocketMessage) {
  const payload = JSON.stringify(message);
  let sent = 0;
  
  clients.forEach((client) => {
    if (client.tenantId === tenantId && client.readyState === WebSocket.OPEN) {
      client.send(payload);
      sent++;
    }
  });
  
  console.log(`Sent message to ${sent} connections for tenantId=${tenantId}:`, message.type);
  return sent > 0;
}

// Send message to specific branch
export function sendWebSocketMessageToBranch(tenantId: string, branchId: string, message: WebSocketMessage) {
  const payload = JSON.stringify(message);
  let sent = 0;
  
  clients.forEach((client) => {
    if (client.tenantId === tenantId && client.branchId === branchId && client.readyState === WebSocket.OPEN) {
      client.send(payload);
      sent++;
    }
  });
  
  console.log(`Sent message to ${sent} connections for branchId=${branchId}:`, message.type);
  return sent > 0;
}

// Get connected clients count
export function getConnectedClientsCount(): number {
  return clients.size;
}

// Get connected users
export function getConnectedUsers(): Array<{ userId: string; tenantId: string; branchId?: string }> {
  return Array.from(clients).map(client => ({
    userId: client.userId!,
    tenantId: client.tenantId!,
    branchId: client.branchId
  }));
}
