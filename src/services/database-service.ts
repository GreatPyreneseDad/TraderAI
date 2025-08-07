import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
    logger.info('Database disconnected');
  }

  async saveMarketData(data: any) {
    return this.prisma.marketData.create({
      data: {
        symbol: data.symbol,
        timestamp: new Date(data.timestamp),
        price: data.price,
        volume: BigInt(data.volume),
        coherenceScores: data.coherenceScores,
        sentiment: data.sentiment
      }
    });
  }

  async saveAlert(alert: any) {
    return this.prisma.alert.create({
      data: {
        type: alert.type || 'COHERENCE_SPIKE',
        severity: alert.severity,
        symbol: alert.symbol,
        title: alert.title || 'Market Alert',
        message: alert.message || JSON.stringify(alert),
        data: alert.data || alert
      }
    });
  }

  async getRecentAlerts(limit: number = 20) {
    return this.prisma.alert.findMany({
      where: { acknowledged: false },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async saveSystemHealth(health: any) {
    return this.prisma.systemHealth.create({
      data: health
    });
  }

  getPrismaClient() {
    return this.prisma;
  }
}