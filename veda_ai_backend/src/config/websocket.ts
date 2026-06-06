import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

// Map of userId → Set of WebSocket clients
const clients = new Map();

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ server });

  wss.on('listening', () => {
    console.log(`WebSocket server initialized and sharing Express HTTP server port`);
  });

  wss.on('connection', (ws, req) => {
    // Client sends { event: 'subscribe', userId } on connect
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'subscribe' && msg.userId) {
          if (!clients.has(msg.userId)) {
            clients.set(msg.userId, new Set());
          }
          clients.get(msg.userId).add(ws);
          ws.send(JSON.stringify({ event: 'subscribed', data: { userId: msg.userId } }));
        }
      } catch (e) {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      // Remove ws from all user sets
      clients.forEach((sockets) => sockets.delete(ws));
    });
  });

  wss.on('error', (err) => {
    console.error('WebSocket server error:', err);
  });

  return wss;
}

/**
 * Emit an event to all WebSocket clients subscribed to a given userId.
 */
export function emitToUser(userId, event, data) {
  const userSockets = clients.get(userId.toString());
  if (!userSockets) return;

  const payload = JSON.stringify({ event, data });
  userSockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}
