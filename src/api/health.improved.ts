import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../infrastructure/types';
import { IDatabaseService } from '../services/database.service.improved';
import { ICacheService } from '../services/cache.service';
import { ECNEService } from '../services/ecne-service';
import { WebSocketServer } from '../websocket/websocket.server';
import { logger } from '../utils/logger';
import os from 'os';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  details?: any;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  uptime: number;
}

@injectable()
export class HealthController {
  constructor(
    @inject(TYPES.DatabaseService) private db: IDatabaseService,
    @inject(TYPES.CacheService) private cache: ICacheService,
    @inject(TYPES.ECNEService) private ecne: ECNEService,
    @inject(TYPES.WebSocketManager) private ws: WebSocketServer,
  ) {}
  
  async checkHealth(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const checks = await this.runHealthChecks();
    const metrics = this.getSystemMetrics();
    
    const overallStatus = this.determineOverallStatus(checks);
    const responseTime = Date.now() - startTime;
    
    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      checks,
      metrics,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
    
    // Log health check
    logger.info('Health check performed', {
      status: overallStatus,
      responseTime,
      failedChecks: checks.filter(c => c.status !== 'healthy').map(c => c.service),
    });
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  }
  
  async checkReadiness(req: Request, res: Response): Promise<void> {
    const criticalChecks = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
    ]);
    
    const isReady = criticalChecks.every(check => check.status === 'healthy');
    const statusCode = isReady ? 200 : 503;
    
    res.status(statusCode).json({
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: criticalChecks,
    });
  }
  
  async checkLiveness(req: Request, res: Response): Promise<void> {
    // Simple liveness check - if the app can respond, it's alive
    res.json({
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
  
  private async runHealthChecks(): Promise<HealthCheckResult[]> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkCache(),
      this.checkECNE(),
      this.checkWebSocket(),
      this.checkDiskSpace(),
    ]);
    
    return checks.map((result, index) => {
      const services = ['database', 'cache', 'ecne', 'websocket', 'disk'];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          service: services[index],
          status: 'unhealthy' as const,
          details: { error: result.reason?.message || 'Check failed' },
        };
      }
    });
  }
  
  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.db.getPrismaClient().$queryRaw`SELECT 1`;
      return {
        service: 'database',
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: { error: (error as Error).message },
      };
    }
  }
  
  private async checkCache(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.cache.ping();
      return {
        service: 'cache',
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        service: 'cache',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: { error: (error as Error).message },
      };
    }
  }
  
  private async checkECNE(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const metrics = await this.ecne.getMetrics();
      const status = metrics.isRunning ? 'healthy' : 'degraded';
      return {
        service: 'ecne',
        status,
        responseTime: Date.now() - start,
        details: {
          dataPoints: metrics.dataPointsProcessed,
          lastUpdate: metrics.lastUpdateTime,
        },
      };
    } catch (error) {
      return {
        service: 'ecne',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: { error: (error as Error).message },
      };
    }
  }
  
  private async checkWebSocket(): Promise<HealthCheckResult> {
    try {
      const stats = this.ws.getStats();
      return {
        service: 'websocket',
        status: 'healthy',
        details: {
          connections: stats.connected,
          rooms: stats.rooms,
        },
      };
    } catch (error) {
      return {
        service: 'websocket',
        status: 'unhealthy',
        details: { error: (error as Error).message },
      };
    }
  }
  
  private async checkDiskSpace(): Promise<HealthCheckResult> {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedPercentage = ((totalMemory - freeMemory) / totalMemory) * 100;
      
      const status = usedPercentage > 90 ? 'unhealthy' : 
                     usedPercentage > 80 ? 'degraded' : 'healthy';
      
      return {
        service: 'disk',
        status,
        details: {
          totalGB: (totalMemory / 1024 / 1024 / 1024).toFixed(2),
          freeGB: (freeMemory / 1024 / 1024 / 1024).toFixed(2),
          usedPercentage: usedPercentage.toFixed(2),
        },
      };
    } catch (error) {
      return {
        service: 'disk',
        status: 'unhealthy',
        details: { error: (error as Error).message },
      };
    }
  }
  
  private getSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Calculate CPU usage
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;
    
    return {
      cpu: {
        usage: Math.round(cpuUsage),
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
      uptime: process.uptime(),
    };
  }
  
  private determineOverallStatus(checks: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    
    if (unhealthyCount > 0) {
      return 'unhealthy';
    } else if (degradedCount > 0) {
      return 'degraded';
    }
    return 'healthy';
  }
}

// Express Router setup
const router = Router();

export function createHealthRouter(container: any): Router {
  const controller = container.get<HealthController>(TYPES.HealthController);
  
  // Main health check endpoint
  router.get('/', (req, res) => controller.checkHealth(req, res));
  
  // Kubernetes-style endpoints
  router.get('/ready', (req, res) => controller.checkReadiness(req, res));
  router.get('/live', (req, res) => controller.checkLiveness(req, res));
  
  return router;
}

export default router;