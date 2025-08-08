import { Server } from 'socket.io';
import { logger } from '../utils/logger';
import axios from 'axios';

export class WebSocketManager {
  private io: Server;
  private connections: Map<string, any> = new Map();
  private pandasAiServiceUrl: string;

  constructor(io: Server) {
    this.io = io;
    this.pandasAiServiceUrl = process.env.PANDAS_AI_SERVICE_URL || 'http://localhost:8001';
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

      // Real-time PandasAI analysis
      socket.on('pandas-ai-query', async (data: { 
        query: string; 
        symbols?: string[]; 
        timeframe?: string; 
        authorization?: string 
      }) => {
        try {
          logger.info(`PandasAI query from ${socket.id}:`, data.query);
          
          const response = await axios.post(
            `${this.pandasAiServiceUrl}/analyze`,
            {
              query: data.query,
              symbols: data.symbols || [],
              timeframe: data.timeframe || '24h',
              use_cache: true
            },
            {
              headers: {
                'Authorization': data.authorization || '',
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );

          socket.emit('pandas-ai-result', {
            requestId: Date.now(),
            success: true,
            result: response.data
          });
        } catch (error) {
          logger.error(`PandasAI query error for ${socket.id}:`, error);
          socket.emit('pandas-ai-result', {
            requestId: Date.now(),
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed'
          });
        }
      });

      // Real-time anomaly detection
      socket.on('detect-anomalies', async (data: { 
        symbols?: string[]; 
        authorization?: string 
      }) => {
        try {
          const response = await axios.post(
            `${this.pandasAiServiceUrl}/anomalies`,
            { symbols: data.symbols || [] },
            {
              headers: {
                'Authorization': data.authorization || '',
                'Content-Type': 'application/json'
              },
              timeout: 20000
            }
          );

          socket.emit('anomalies-detected', {
            success: true,
            anomalies: response.data.anomalies || []
          });
        } catch (error) {
          logger.error(`Anomaly detection error for ${socket.id}:`, error);
          socket.emit('anomalies-detected', {
            success: false,
            error: error instanceof Error ? error.message : 'Anomaly detection failed'
          });
        }
      });

      // Real-time trading signals
      socket.on('generate-signals', async (data: { 
        strategy: string; 
        symbols: string[]; 
        authorization?: string 
      }) => {
        try {
          const response = await axios.post(
            `${this.pandasAiServiceUrl}/signals`,
            { 
              strategy: data.strategy,
              symbols: data.symbols 
            },
            {
              headers: {
                'Authorization': data.authorization || '',
                'Content-Type': 'application/json'
              },
              timeout: 25000
            }
          );

          socket.emit('signals-generated', {
            success: true,
            signals: response.data.signals || []
          });
        } catch (error) {
          logger.error(`Signal generation error for ${socket.id}:`, error);
          socket.emit('signals-generated', {
            success: false,
            error: error instanceof Error ? error.message : 'Signal generation failed'
          });
        }
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

  // Broadcast PandasAI analysis results to all connected clients
  broadcastAnalysisResult(result: any) {
    this.io.emit('pandas-ai-broadcast', {
      type: 'analysis',
      data: result,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast anomaly alerts to all connected clients
  broadcastAnomalyAlert(anomalies: any[]) {
    if (anomalies && anomalies.length > 0) {
      this.io.emit('pandas-ai-broadcast', {
        type: 'anomalies',
        data: { anomalies, count: anomalies.length },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Broadcast trading signals to subscribed symbol rooms
  broadcastTradingSignals(signals: any[], symbols: string[]) {
    symbols.forEach(symbol => {
      const symbolSignals = signals.filter(s => s.symbol === symbol);
      if (symbolSignals.length > 0) {
        this.io.to(`market:${symbol}`).emit('trading-signals', {
          symbol,
          signals: symbolSignals,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // Send direct message to specific client
  sendToClient(socketId: string, event: string, data: any) {
    const socket = this.connections.get(socketId);
    if (socket) {
      socket.emit(event, data);
    }
  }
}