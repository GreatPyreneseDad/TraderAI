import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger';

export interface GCTConfig {
  coherenceThresholds: {
    psi: number;
    rho: number;
    q: number;
    f: number;
  };
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  news?: string[];
}

export interface CoherenceScores {
  psi: number;  // Consciousness (human awareness)
  rho: number;  // Density (information compression)
  q: number;    // Charge (emotional intensity)
  f: number;    // Frequency (update rate)
  composite: number;
}

export class GCTService extends EventEmitter {
  private config: GCTConfig;
  private pythonProcess: any;
  private isInitialized: boolean = false;

  constructor(config: GCTConfig) {
    super();
    this.config = config;
  }

  async initialize() {
    try {
      // Path to GCT market sentiment module
      const gctPath = path.join(__dirname, '../../gct-market/gct-market-sentiment');
      
      // Start Python GCT engine as subprocess
      this.pythonProcess = spawn('python3', [
        path.join(gctPath, 'src/gct_engine.py'),
        '--mode', 'service',
        '--thresholds', JSON.stringify(this.config.coherenceThresholds)
      ], {
        cwd: gctPath,
        env: { ...process.env, PYTHONPATH: gctPath }
      });

      this.pythonProcess.stdout.on('data', (data: Buffer) => {
        try {
          const result = JSON.parse(data.toString());
          this.handleGCTResult(result);
        } catch (error) {
          logger.error('Failed to parse GCT output:', error);
        }
      });

      this.pythonProcess.stderr.on('data', (data: Buffer) => {
        logger.error('GCT error:', data.toString());
      });

      this.pythonProcess.on('close', (code: number) => {
        logger.info(`GCT process exited with code ${code}`);
        this.isInitialized = false;
      });

      this.isInitialized = true;
      logger.info('GCT Market Sentiment service initialized');

    } catch (error) {
      logger.error('Failed to initialize GCT service:', error);
      throw error;
    }
  }

  async processMarketData(data: MarketData): Promise<CoherenceScores> {
    if (!this.isInitialized) {
      throw new Error('GCT service not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('GCT processing timeout'));
      }, 5000);

      const handler = (result: any) => {
        if (result.symbol === data.symbol) {
          clearTimeout(timeout);
          this.removeListener('coherence-calculated', handler);
          resolve(result.coherence);
        }
      };

      this.on('coherence-calculated', handler);

      // Send data to Python process
      this.pythonProcess.stdin.write(JSON.stringify({
        action: 'process',
        data
      }) + '\n');
    });
  }

  private handleGCTResult(result: any) {
    switch (result.type) {
      case 'coherence':
        this.emit('coherence-calculated', result);
        
        // Check for alerts
        const scores = result.coherence;
        if (this.checkAlertThresholds(scores)) {
          this.emit('coherence-alert', {
            symbol: result.symbol,
            scores,
            timestamp: new Date(),
            severity: this.calculateSeverity(scores)
          });
        }
        break;

      case 'error':
        logger.error('GCT processing error:', result.error);
        this.emit('error', new Error(result.error));
        break;

      default:
        logger.warn('Unknown GCT result type:', result.type);
    }
  }

  private checkAlertThresholds(scores: CoherenceScores): boolean {
    return (
      scores.psi > this.config.coherenceThresholds.psi ||
      scores.rho > this.config.coherenceThresholds.rho ||
      scores.q > this.config.coherenceThresholds.q ||
      scores.f > this.config.coherenceThresholds.f
    );
  }

  private calculateSeverity(scores: CoherenceScores): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const exceededCount = [
      scores.psi > this.config.coherenceThresholds.psi,
      scores.rho > this.config.coherenceThresholds.rho,
      scores.q > this.config.coherenceThresholds.q,
      scores.f > this.config.coherenceThresholds.f
    ].filter(Boolean).length;

    if (exceededCount >= 4) return 'CRITICAL';
    if (exceededCount >= 3) return 'HIGH';
    if (exceededCount >= 2) return 'MEDIUM';
    return 'LOW';
  }

  async shutdown() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.isInitialized = false;
      logger.info('GCT service shut down');
    }
  }
}