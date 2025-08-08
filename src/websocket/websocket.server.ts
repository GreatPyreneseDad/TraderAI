import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { injectable, inject } from 'inversify';
import { TYPES } from '../infrastructure/types';
import { logger } from '../utils/logger';

export interface SocketData {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@injectable()
export class WebSocketServer {
  private io: Server;
  private pubClient: Redis;
  private subClient: Redis;
  
  constructor(
    @inject(TYPES.Redis) private redis: Redis
  ) {
    this.pubClient = this.redis.duplicate();
    this.subClient = this.redis.duplicate();
  }
  
  initialize(httpServer: any): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      },
      adapter: createAdapter(this.pubClient, this.subClient),
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    
    this.setupMiddleware();
    this.setupHandlers();
    
    logger.info('WebSocket server initialized');
  }
  
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        
        const decoded = jwt.verify(
          token, 
          process.env.JWT_SECRET || 'your-secret-key'
        ) as any;
        
        socket.data.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        };
        
        logger.info(`User ${decoded.email} connected via WebSocket`);
        next();
      } catch (err) {
        logger.error('WebSocket authentication failed:', err);
        next(new Error('Authentication failed'));
      }
    });
  }
  
  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      const userId = socket.data.user.id;
      
      // Join user-specific room
      socket.join(`user:${userId}`);
      
      // Send connection confirmation
      socket.emit('connected', {
        userId,
        serverTime: new Date().toISOString(),
      });
      
      // Handle symbol subscriptions
      socket.on('subscribe', async (data: { symbols: string[] }) => {
        try {
          const { symbols } = data;
          
          // Validate subscription limits
          const currentRooms = Array.from(socket.rooms)
            .filter(room => room.startsWith('symbol:'));
          
          if (currentRooms.length + symbols.length > 10) {
            socket.emit('error', { 
              message: 'Maximum 10 symbol subscriptions allowed',
              code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
            });
            return;
          }
          
          // Validate symbols
          const validSymbols = symbols.filter(s => 
            /^[A-Z]{1,5}$/.test(s)
          );
          
          if (validSymbols.length !== symbols.length) {
            socket.emit('error', {
              message: 'Invalid symbol format',
              code: 'INVALID_SYMBOL',
            });
            return;
          }
          
          // Subscribe to symbol rooms
          for (const symbol of validSymbols) {
            socket.join(`symbol:${symbol}`);
          }
          
          socket.emit('subscribed', { 
            symbols: validSymbols,
            timestamp: new Date().toISOString(),
          });
          
          logger.info(`User ${userId} subscribed to symbols:`, validSymbols);
        } catch (error) {
          logger.error('Subscription error:', error);
          socket.emit('error', {
            message: 'Subscription failed',
            code: 'SUBSCRIPTION_ERROR',
          });
        }
      });
      
      // Handle unsubscribe
      socket.on('unsubscribe', (data: { symbols: string[] }) => {
        const { symbols } = data;
        
        for (const symbol of symbols) {
          socket.leave(`symbol:${symbol}`);
        }
        
        socket.emit('unsubscribed', { 
          symbols,
          timestamp: new Date().toISOString(),
        });
        
        logger.info(`User ${userId} unsubscribed from symbols:`, symbols);
      });
      
      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { 
          timestamp: new Date().toISOString(),
        });
      });
      
      // Clean up on disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`User ${userId} disconnected: ${reason}`);
      });
      
      // Error handling
      socket.on('error', (error) => {
        logger.error(`WebSocket error for user ${userId}:`, error);
      });
    });
  }
  
  // Broadcast market data to symbol subscribers
  broadcastMarketData(symbol: string, data: any): void {
    this.io.to(`symbol:${symbol}`).emit('market-data', {
      symbol,
      data,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Broadcast coherence update
  broadcastCoherenceUpdate(symbol: string, coherence: any): void {
    this.io.to(`symbol:${symbol}`).emit('coherence-update', {
      symbol,
      coherence,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Send alert to all connected users
  broadcastAlert(alert: any): void {
    this.io.emit('alert', {
      ...alert,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Send to specific user
  sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Get connection statistics
  getStats() {
    return {
      connected: this.io.sockets.sockets.size,
      rooms: this.io.sockets.adapter.rooms.size,
    };
  }
}