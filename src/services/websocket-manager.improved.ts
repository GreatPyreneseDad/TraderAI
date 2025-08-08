import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

interface ConnectionInfo {
  socket: Socket;
  connectedAt: Date;
  lastActivity: Date;
  subscriptions: Set<string>;
}

export class WebSocketManager {
  private io: Server;
  private connections: Map<string, ConnectionInfo> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly HEARTBEAT_INTERVAL = parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000');
  private readonly CONNECTION_TIMEOUT = 60000; // 1 minute
  private readonly MAX_CONNECTIONS_PER_IP = 10;
  private readonly MAX_RECONNECT_ATTEMPTS = parseInt(process.env.WS_RECONNECT_ATTEMPTS || '5');

  constructor(io: Server) {
    this.io = io;
  }

  initialize() {
    try {
      // Set up connection handling with error boundaries
      this.io.on('connection', (socket) => {
        this.handleNewConnection(socket);
      });

      // Start heartbeat mechanism
      this.startHeartbeat();
      
      // Start cleanup mechanism for stale connections
      this.startCleanup();

      logger.info('WebSocket manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebSocket manager:', error);
      throw error;
    }
  }

  private handleNewConnection(socket: Socket) {
    try {
      const clientIp = socket.handshake.address;
      
      // Rate limiting by IP
      const connectionsFromIp = Array.from(this.connections.values())
        .filter(conn => conn.socket.handshake.address === clientIp).length;
      
      if (connectionsFromIp >= this.MAX_CONNECTIONS_PER_IP) {
        logger.warn(`Connection limit exceeded for IP: ${clientIp}`);
        socket.emit('error', { message: 'Connection limit exceeded' });
        socket.disconnect();
        return;
      }

      logger.info(`New WebSocket connection: ${socket.id} from ${clientIp}`);
      
      // Store connection info
      this.connections.set(socket.id, {
        socket,
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: new Set()
      });

      // Set up error handling for this socket
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
        this.handleDisconnect(socket.id);
      });

      // Handle subscription with validation
      socket.on('subscribe', (symbols: unknown) => {
        try {
          if (!Array.isArray(symbols)) {
            socket.emit('error', { message: 'Invalid symbols format' });
            return;
          }
          
          const validSymbols = symbols.filter(s => typeof s === 'string' && s.length > 0);
          const connectionInfo = this.connections.get(socket.id);
          
          if (connectionInfo) {
            logger.info(`Client ${socket.id} subscribing to: ${validSymbols.join(', ')}`);
            validSymbols.forEach(symbol => {
              socket.join(`market:${symbol}`);
              connectionInfo.subscriptions.add(symbol);
            });
            connectionInfo.lastActivity = new Date();
          }
        } catch (error) {
          logger.error(`Subscribe error for ${socket.id}:`, error);
          socket.emit('error', { message: 'Subscription failed' });
        }
      });

      // Handle unsubscription
      socket.on('unsubscribe', (symbols: unknown) => {
        try {
          if (!Array.isArray(symbols)) return;
          
          const connectionInfo = this.connections.get(socket.id);
          if (connectionInfo) {
            symbols.forEach(symbol => {
              if (typeof symbol === 'string') {
                socket.leave(`market:${symbol}`);
                connectionInfo.subscriptions.delete(symbol);
              }
            });
            connectionInfo.lastActivity = new Date();
          }
        } catch (error) {
          logger.error(`Unsubscribe error for ${socket.id}:`, error);
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`WebSocket disconnected: ${socket.id}, reason: ${reason}`);
        this.handleDisconnect(socket.id);
      });

      // Handle heartbeat response
      socket.on('pong', () => {
        const connectionInfo = this.connections.get(socket.id);
        if (connectionInfo) {
          connectionInfo.lastActivity = new Date();
        }
      });

      // Send initial connection success
      socket.emit('connected', { 
        id: socket.id,
        heartbeatInterval: this.HEARTBEAT_INTERVAL
      });

    } catch (error) {
      logger.error('Error handling new connection:', error);
      try {
        socket.disconnect();
      } catch (disconnectError) {
        logger.error('Error disconnecting socket:', disconnectError);
      }
    }
  }

  private handleDisconnect(socketId: string) {
    try {
      const connectionInfo = this.connections.get(socketId);
      if (connectionInfo) {
        // Clear all subscriptions
        connectionInfo.subscriptions.clear();
        this.connections.delete(socketId);
      }
    } catch (error) {
      logger.error(`Error handling disconnect for ${socketId}:`, error);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      try {
        this.connections.forEach((info, socketId) => {
          try {
            info.socket.emit('ping');
          } catch (error) {
            logger.error(`Error sending heartbeat to ${socketId}:`, error);
            this.handleDisconnect(socketId);
          }
        });
      } catch (error) {
        logger.error('Error in heartbeat cycle:', error);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      try {
        const now = new Date();
        const timeout = this.CONNECTION_TIMEOUT;
        
        this.connections.forEach((info, socketId) => {
          const timeSinceLastActivity = now.getTime() - info.lastActivity.getTime();
          
          if (timeSinceLastActivity > timeout) {
            logger.info(`Cleaning up stale connection: ${socketId}`);
            try {
              info.socket.disconnect();
            } catch (error) {
              logger.error(`Error disconnecting stale socket ${socketId}:`, error);
            }
            this.handleDisconnect(socketId);
          }
        });
      } catch (error) {
        logger.error('Error in cleanup cycle:', error);
      }
    }, 30000); // Run cleanup every 30 seconds
  }

  broadcast(event: string, data: any) {
    try {
      this.io.emit(event, data);
    } catch (error) {
      logger.error(`Error broadcasting event ${event}:`, error);
    }
  }

  broadcastToSymbol(symbol: string, event: string, data: any) {
    try {
      this.io.to(`market:${symbol}`).emit(event, data);
    } catch (error) {
      logger.error(`Error broadcasting to symbol ${symbol}:`, error);
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getConnectionStats() {
    const stats = {
      totalConnections: this.connections.size,
      connectionsBySymbol: new Map<string, number>(),
      averageConnectionDuration: 0
    };

    let totalDuration = 0;
    const now = new Date();

    this.connections.forEach((info) => {
      // Calculate connection duration
      totalDuration += now.getTime() - info.connectedAt.getTime();
      
      // Count subscriptions by symbol
      info.subscriptions.forEach(symbol => {
        stats.connectionsBySymbol.set(
          symbol,
          (stats.connectionsBySymbol.get(symbol) || 0) + 1
        );
      });
    });

    if (stats.totalConnections > 0) {
      stats.averageConnectionDuration = totalDuration / stats.totalConnections;
    }

    return stats;
  }

  shutdown() {
    try {
      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Disconnect all clients gracefully
      this.connections.forEach((info, socketId) => {
        try {
          info.socket.emit('server-shutdown', { message: 'Server is shutting down' });
          info.socket.disconnect();
        } catch (error) {
          logger.error(`Error disconnecting ${socketId} during shutdown:`, error);
        }
      });

      this.connections.clear();
      logger.info('WebSocket manager shut down successfully');
    } catch (error) {
      logger.error('Error during WebSocket manager shutdown:', error);
    }
  }
}