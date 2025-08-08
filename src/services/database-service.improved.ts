import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
}

export class DatabaseService {
  private prisma: PrismaClient;
  private isConnected: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  private readonly retryConfig: RetryConfig = {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    factor: 2
  };

  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'info' },
      ],
      errorFormat: 'pretty',
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Error handling
    this.prisma.$on('error' as never, (e: any) => {
      logger.error('Prisma error:', e);
      this.handleConnectionError();
    });

    // Warning handling
    this.prisma.$on('warn' as never, (e: any) => {
      logger.warn('Prisma warning:', e);
    });

    // Info logging
    this.prisma.$on('info' as never, (e: any) => {
      logger.debug('Prisma info:', e);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.connectWithRetry();
      this.startHealthCheck();
    } catch (error) {
      logger.error('Failed to establish database connection after retries:', error);
      throw error;
    }
  }

  private async connectWithRetry(retryCount = 0): Promise<void> {
    try {
      await this.prisma.$connect();
      
      // Verify connection with a simple query
      await this.prisma.$queryRaw`SELECT 1`;
      
      this.isConnected = true;
      logger.info('Database connected successfully');
      
      // Clear any pending reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    } catch (error) {
      this.isConnected = false;
      
      if (retryCount >= this.retryConfig.maxRetries) {
        throw error;
      }
      
      const delay = Math.min(
        this.retryConfig.initialDelay * Math.pow(this.retryConfig.factor, retryCount),
        this.retryConfig.maxDelay
      );
      
      logger.warn(`Database connection failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.retryConfig.maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.connectWithRetry(retryCount + 1);
    }
  }

  private handleConnectionError() {
    this.isConnected = false;
    
    // Schedule reconnection if not already scheduled
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(() => {
        logger.info('Attempting to reconnect to database...');
        this.connect().catch(error => {
          logger.error('Reconnection failed:', error);
        });
      }, 5000);
    }
  }

  private startHealthCheck() {
    // Periodic health check
    this.healthCheckInterval = setInterval(async () => {
      try {
        if (this.isConnected) {
          await this.prisma.$queryRaw`SELECT 1`;
        }
      } catch (error) {
        logger.error('Database health check failed:', error);
        this.handleConnectionError();
      }
    }, 30000); // Check every 30 seconds
  }

  async disconnect(): Promise<void> {
    try {
      // Clear intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      await this.prisma.$disconnect();
      this.isConnected = false;
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (!this.isConnected) {
          throw new Error('Database not connected');
        }
        
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (this.isRetryableError(error)) {
          if (attempt < this.retryConfig.maxRetries) {
            const delay = Math.min(
              this.retryConfig.initialDelay * Math.pow(this.retryConfig.factor, attempt),
              this.retryConfig.maxDelay
            );
            
            logger.warn(`${operationName} failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Non-retryable error or max retries exceeded
        logger.error(`${operationName} failed:`, error);
        throw error;
      }
    }
    
    throw lastError;
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Connection errors
      if (['P1001', 'P1002', 'P1003', 'P1008', 'P1009', 'P1010'].includes(error.code)) {
        return true;
      }
    }
    
    // Network errors
    if (error.message && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')
    )) {
      return true;
    }
    
    return false;
  }

  async saveMarketData(data: any): Promise<any> {
    return this.executeWithRetry(async () => {
      // Validate input data
      if (!data.symbol || !data.timestamp || data.price === undefined || data.volume === undefined) {
        throw new Error('Invalid market data: missing required fields');
      }
      
      return this.prisma.marketData.create({
        data: {
          symbol: String(data.symbol).toUpperCase(),
          timestamp: new Date(data.timestamp),
          price: Number(data.price),
          volume: BigInt(data.volume),
          coherenceScores: data.coherenceScores || { psi: 0, rho: 0, q: 0, f: 0 },
          sentiment: data.sentiment !== undefined ? Number(data.sentiment) : null
        }
      });
    }, 'saveMarketData');
  }

  async saveMarketDataBatch(dataArray: any[]): Promise<number> {
    return this.executeWithRetry(async () => {
      // Validate and transform data
      const validData = dataArray
        .filter(data => data.symbol && data.timestamp && data.price !== undefined && data.volume !== undefined)
        .map(data => ({
          symbol: String(data.symbol).toUpperCase(),
          timestamp: new Date(data.timestamp),
          price: Number(data.price),
          volume: BigInt(data.volume),
          coherenceScores: data.coherenceScores || { psi: 0, rho: 0, q: 0, f: 0 },
          sentiment: data.sentiment !== undefined ? Number(data.sentiment) : undefined
        }));
      
      if (validData.length === 0) {
        logger.warn('No valid market data to save in batch');
        return 0;
      }
      
      const result = await this.prisma.marketData.createMany({
        data: validData,
        skipDuplicates: true
      });
      
      return result.count;
    }, 'saveMarketDataBatch');
  }

  async saveAlert(alert: any): Promise<any> {
    return this.executeWithRetry(async () => {
      // Validate alert type and severity
      const validTypes = ['COHERENCE_SPIKE', 'MARKET_ANOMALY', 'SYSTEM_ERROR', 'API_LIMIT', 'DEBATE_CONSENSUS'];
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      
      const alertType = validTypes.includes(alert.type) ? alert.type : 'MARKET_ANOMALY';
      const alertSeverity = validSeverities.includes(alert.severity) ? alert.severity : 'MEDIUM';
      
      return this.prisma.alert.create({
        data: {
          type: alertType as any,
          severity: alertSeverity as any,
          symbol: alert.symbol || null,
          title: alert.title || 'Market Alert',
          message: alert.message || JSON.stringify(alert),
          data: alert.data || alert
        }
      });
    }, 'saveAlert');
  }

  async getRecentAlerts(limit: number = 20): Promise<any[]> {
    return this.executeWithRetry(async () => {
      return this.prisma.alert.findMany({
        where: { acknowledged: false },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100) // Cap at 100 to prevent excessive queries
      });
    }, 'getRecentAlerts');
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<any> {
    return this.executeWithRetry(async () => {
      return this.prisma.alert.update({
        where: { id: alertId },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: userId
        }
      });
    }, 'acknowledgeAlert');
  }

  async saveSystemHealth(health: any): Promise<any> {
    return this.executeWithRetry(async () => {
      const validStatuses = ['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'OFFLINE'];
      const status = validStatuses.includes(health.status) ? health.status : 'UNHEALTHY';
      
      return this.prisma.systemHealth.create({
        data: {
          service: health.service || 'unknown',
          status: status as any,
          message: health.message || null,
          metrics: health.metrics || null
        }
      });
    }, 'saveSystemHealth');
  }

  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    return this.executeWithRetry(async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      // Clean up old market data
      const marketDataResult = await this.prisma.marketData.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });
      
      logger.info(`Cleaned up ${marketDataResult.count} old market data records`);
      
      // Clean up old system health records
      const healthResult = await this.prisma.systemHealth.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });
      
      logger.info(`Cleaned up ${healthResult.count} old system health records`);
      
      // Clean up acknowledged alerts older than cutoff
      const alertResult = await this.prisma.alert.deleteMany({
        where: {
          acknowledged: true,
          acknowledgedAt: {
            lt: cutoffDate
          }
        }
      });
      
      logger.info(`Cleaned up ${alertResult.count} old acknowledged alerts`);
    }, 'cleanupOldData');
  }

  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async getConnectionStats() {
    try {
      const [marketDataCount, alertCount, healthCount] = await Promise.all([
        this.prisma.marketData.count(),
        this.prisma.alert.count({ where: { acknowledged: false } }),
        this.prisma.systemHealth.count()
      ]);
      
      return {
        isConnected: this.isConnected,
        marketDataRecords: marketDataCount,
        activeAlerts: alertCount,
        healthRecords: healthCount
      };
    } catch (error) {
      logger.error('Error getting connection stats:', error);
      return {
        isConnected: this.isConnected,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}