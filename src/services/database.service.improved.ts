import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { injectable, inject } from 'inversify';
import { TYPES } from '../infrastructure/types';
import { ICacheService } from './cache.service';
import { logger } from '../utils/logger';

export interface IMarketData {
  symbol: string;
  timestamp: Date;
  price: number;
  volume: bigint;
  coherencePsi: number;
  coherenceRho: number;
  coherenceQ: number;
  coherenceF: number;
  sentiment?: number;
}

export interface IDatabaseService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  saveMarketData(data: IMarketData): Promise<any>;
  saveMarketDataBatch(data: IMarketData[]): Promise<void>;
  getMarketData(symbol: string, timeframe: string): Promise<any[]>;
  saveAlert(alert: any): Promise<any>;
  getRecentAlerts(limit?: number): Promise<any[]>;
  getPrismaClient(): PrismaClient;
}

@injectable()
export class DatabaseService implements IDatabaseService {
  private prisma: PrismaClient;
  private readReplica: PrismaClient;
  private connectionPool: Pool;
  
  constructor(
    @inject(TYPES.CacheService) private cache: ICacheService
  ) {
    // Main write connection
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
    
    // Read replica for heavy queries (if available)
    const readReplicaUrl = process.env.DATABASE_READ_REPLICA_URL || process.env.DATABASE_URL;
    this.readReplica = new PrismaClient({
      datasources: {
        db: {
          url: readReplicaUrl,
        },
      },
    });
    
    // Connection pool for raw queries
    this.connectionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    this.setupQueryLogging();
  }
  
  private setupQueryLogging(): void {
    this.prisma.$on('query' as never, (e: any) => {
      if (e.duration > 1000) {
        logger.warn('Slow query detected', {
          query: e.query,
          duration: e.duration,
          params: e.params,
        });
      }
    });
  }
  
  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.prisma.$connect(),
        this.readReplica.$connect(),
      ]);
      logger.info('Database connections established');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    await Promise.all([
      this.prisma.$disconnect(),
      this.readReplica.$disconnect(),
      this.connectionPool.end(),
    ]);
    logger.info('Database connections closed');
  }
  
  async saveMarketData(data: IMarketData): Promise<any> {
    try {
      const result = await this.prisma.marketData.create({
        data: {
          symbol: data.symbol,
          timestamp: data.timestamp,
          price: new Prisma.Decimal(data.price),
          volume: data.volume,
          coherenceScores: {
            psi: data.coherencePsi,
            rho: data.coherenceRho,
            q: data.coherenceQ,
            f: data.coherenceF,
          },
          sentiment: data.sentiment,
        },
      });
      
      // Invalidate cache for this symbol
      await this.cache.invalidatePattern(`market:${data.symbol}:*`);
      
      return result;
    } catch (error) {
      logger.error('Error saving market data:', error);
      throw error;
    }
  }
  
  async saveMarketDataBatch(data: IMarketData[]): Promise<void> {
    const batchSize = 1000;
    
    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        await this.prisma.$transaction(async (tx) => {
          await tx.marketData.createMany({
            data: batch.map(item => ({
              symbol: item.symbol,
              timestamp: item.timestamp,
              price: new Prisma.Decimal(item.price),
              volume: item.volume,
              coherenceScores: {
                psi: item.coherencePsi,
                rho: item.coherenceRho,
                q: item.coherenceQ,
                f: item.coherenceF,
              },
              sentiment: item.sentiment,
            })),
            skipDuplicates: true,
          });
        });
        
        // Log progress for large batches
        if (data.length > batchSize) {
          const progress = Math.min(100, ((i + batchSize) / data.length) * 100);
          logger.info(`Batch insert progress: ${progress.toFixed(1)}%`);
        }
      }
      
      // Invalidate cache for affected symbols
      const symbols = [...new Set(data.map(d => d.symbol))];
      await Promise.all(
        symbols.map(symbol => this.cache.invalidatePattern(`market:${symbol}:*`))
      );
    } catch (error) {
      logger.error('Error in batch insert:', error);
      throw error;
    }
  }
  
  async getMarketData(symbol: string, timeframe: string): Promise<any[]> {
    const cacheKey = `market:${symbol}:${timeframe}`;
    
    return this.cache.remember(cacheKey, 300, async () => {
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      
      return this.readReplica.marketData.findMany({
        where: {
          symbol,
          timestamp: {
            gte: startDate,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 1000,
      });
    });
  }
  
  async saveAlert(alert: any): Promise<any> {
    return this.prisma.alert.create({
      data: {
        type: alert.type || 'COHERENCE_SPIKE',
        severity: alert.severity,
        symbol: alert.symbol,
        title: alert.title || 'Market Alert',
        message: alert.message || JSON.stringify(alert),
        data: alert.data || alert,
      },
    });
  }
  
  async getRecentAlerts(limit: number = 20): Promise<any[]> {
    return this.cache.remember(`alerts:recent:${limit}`, 60, async () => {
      return this.readReplica.alert.findMany({
        where: { acknowledged: false },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    });
  }
  
  // Raw query example for complex aggregations
  async getMarketStatistics(symbols: string[]): Promise<any> {
    const query = `
      SELECT 
        symbol,
        COUNT(*) as data_points,
        AVG((coherenceScores->>'psi')::float) as avg_psi,
        AVG((coherenceScores->>'rho')::float) as avg_rho,
        AVG(price::float) as avg_price,
        MAX(price::float) as max_price,
        MIN(price::float) as min_price,
        SUM(volume) as total_volume
      FROM market_data
      WHERE symbol = ANY($1)
        AND timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY symbol
    `;
    
    const result = await this.connectionPool.query(query, [symbols]);
    return result.rows;
  }
  
  getPrismaClient(): PrismaClient {
    return this.prisma;
  }
}