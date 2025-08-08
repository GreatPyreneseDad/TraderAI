import { EventEmitter } from 'events';
import { ECNEDataRiver } from '@ecne/ecne';
import { logger } from '../utils/logger';

export interface ECNEConfig {
  maxConcurrent: number;
  batchSize: number;
  cacheMaxItems: number;
  cacheTTL: number;
}

export class ECNEService extends EventEmitter {
  private ecne: ECNEDataRiver;
  private config: ECNEConfig;

  constructor(config: ECNEConfig) {
    super();
    this.config = config;
  }

  async initialize() {
    try {
      // Initialize ECNE Data River
      this.ecne = new ECNEDataRiver({
        filter: {
          coherenceThresholds: {
            psi: 0.7,
            rho: 0.6,
            q: 0.5,
            f: 0.4
          }
        },
        collector: {
          maxConcurrent: this.config.maxConcurrent,
          batchSize: this.config.batchSize
        },
        cache: {
          enabled: true,
          maxMemoryItems: this.config.cacheMaxItems,
          defaultTTL: this.config.cacheTTL
        },
        dashboard: {
          enabled: false
        }
      });

      // Add data sources
      const sources = [
        {
          id: 'tiingo-rest',
          type: 'rest' as const,
          url: 'https://api.tiingo.com/tiingo/daily/prices',
          headers: {
            'Authorization': `Token ${process.env.TIINGO_API_TOKEN}`
          },
          rateLimit: { requests: 100, period: 60000 }
        },
        {
          id: 'tiingo-websocket',
          type: 'websocket' as const,
          url: 'wss://api.tiingo.com/iex',
          auth: {
            token: process.env.TIINGO_API_TOKEN
          }
        }
      ];

      // Set up event handlers
      this.ecne.on('data', (data: any) => {
        this.emit('data', data);
      });

      this.ecne.on('error', (error: any) => {
        logger.error('ECNE error:', error);
        this.emit('error', error);
      });

      this.ecne.on('coherence-alert', (alert: any) => {
        logger.info('Coherence alert:', alert);
        this.emit('coherence-alert', alert);
      });

      await this.ecne.start(sources);
      logger.info('ECNE Data River started successfully');

    } catch (error) {
      logger.error('Failed to initialize ECNE:', error);
      throw error;
    }
  }

  async processSymbols(symbols: string[]) {
    try {
      const results = await this.ecne.processBatch(symbols.map(symbol => ({
        id: symbol,
        type: 'stock',
        symbol
      })));
      return results;
    } catch (error) {
      logger.error('Failed to process symbols:', error);
      throw error;
    }
  }

  async getMetrics() {
    return this.ecne.getMetrics();
  }

  async shutdown() {
    if (this.ecne) {
      await this.ecne.stop();
      logger.info('ECNE Data River stopped');
    }
  }
}