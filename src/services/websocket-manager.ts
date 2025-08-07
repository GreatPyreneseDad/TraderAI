import { Server } from 'socket.io';
import { logger } from '../utils/logger';

export class WebSocketManager {
  private io: Server;
  private connections: Map<string, any> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  initialize() {
    this.io.on('connection', (socket) => {
      logger.info(`New WebSocket connection: ${socket.id}`);
      this.connections.set(socket.id, socket);

      socket.on('subscribe', (symbols: string[]) => {
        logger.info(`Client ${socket.id} subscribing to: ${symbols.join(', ')}`);
        symbols.forEach(symbol => {
          socket.join(`market:${symbol}`);
        });
      });

      socket.on('unsubscribe', (symbols: string[]) => {
        symbols.forEach(symbol => {
          socket.leave(`market:${symbol}`);
        });
      });

      socket.on('disconnect', () => {
        logger.info(`WebSocket disconnected: ${socket.id}`);
        this.connections.delete(socket.id);
      });
    });
  }

  broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }

  broadcastToSymbol(symbol: string, event: string, data: any) {
    this.io.to(`market:${symbol}`).emit(event, data);
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}