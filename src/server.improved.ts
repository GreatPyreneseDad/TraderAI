import 'reflect-metadata';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import infrastructure
import { container } from './infrastructure/container';
import { TYPES } from './infrastructure/types';
import { securityMiddleware } from './middleware/security.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error-handler';

// Import services
import { DatabaseService } from './services/database.service.improved';
import { CacheService } from './services/cache.service';
import { ECNEService } from './services/ecne-service';
import { GCTService } from './services/gct-service';
import { ClaudeService } from './services/claude-service';
import { WebSocketServer } from './websocket/websocket.server';

// Import routes
import marketRoutes from './api/market';
import inferenceRoutes from './api/inference';
import debateRoutes from './api/debate';
import { createHealthRouter } from './api/health.improved';

// Logger
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

class Server {
  private app: express.Application;
  private httpServer: any;
  private container = container;
  
  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.setupDependencies();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }
  
  private setupDependencies(): void {
    // Bind services to container
    container.bind<DatabaseService>(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();
    container.bind<CacheService>(TYPES.CacheService).to(CacheService).inSingletonScope();
    container.bind<ECNEService>(TYPES.ECNEService).toConstantValue(
      new ECNEService({
        maxConcurrent: 10,
        batchSize: 100,
        cacheMaxItems: 1000,
        cacheTTL: 300,
      })
    );
    container.bind<GCTService>(TYPES.GCTService).to(GCTService).inSingletonScope();
    container.bind<ClaudeService>(TYPES.ClaudeService).to(ClaudeService).inSingletonScope();
    container.bind<WebSocketServer>(TYPES.WebSocketManager).to(WebSocketServer).inSingletonScope();
    
    // Auth middleware
    const redis = container.get<any>(TYPES.Redis);
    const authMiddleware = new AuthMiddleware(redis);
    container.bind<AuthMiddleware>(TYPES.AuthService).toConstantValue(authMiddleware);
  }
  
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(securityMiddleware);
    
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request processed', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });
      });
      next();
    });
  }
  
  private setupRoutes(): void {
    // Health check routes (no auth required)
    this.app.use('/api/health', createHealthRouter(this.container));
    
    // API routes
    const authMiddleware = this.container.get<AuthMiddleware>(TYPES.AuthService);
    
    // Public routes
    this.app.post('/api/auth/login', this.handleLogin.bind(this));
    this.app.post('/api/auth/register', this.handleRegister.bind(this));
    
    // Protected routes
    this.app.use('/api/market', 
      authMiddleware.authenticate.bind(authMiddleware),
      marketRoutes
    );
    this.app.use('/api/inference', 
      authMiddleware.authenticate.bind(authMiddleware),
      inferenceRoutes
    );
    this.app.use('/api/debate', 
      authMiddleware.authenticate.bind(authMiddleware),
      debateRoutes
    );
    
    // Static files for dashboard
    if (process.env.NODE_ENV === 'production') {
      this.app.use('/dashboard', express.static(path.join(__dirname, '../dashboard/dist')));
    }
    
    // Metrics endpoint for Prometheus
    this.app.get('/api/metrics', this.handleMetrics.bind(this));
  }
  
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: {
          message: 'Resource not found',
          path: req.path,
        },
      });
    });
    
    // Global error handler
    this.app.use(errorHandler);
  }
  
  private async handleLogin(req: express.Request, res: express.Response): Promise<void> {
    // TODO: Implement proper authentication
    // This is a placeholder implementation
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }
    
    // Mock authentication
    const token = 'mock-jwt-token';
    res.json({ token, user: { id: '1', email, role: 'user' } });
  }
  
  private async handleRegister(req: express.Request, res: express.Response): Promise<void> {
    // TODO: Implement proper registration
    // This is a placeholder implementation
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }
    
    res.json({ message: 'Registration successful' });
  }
  
  private async handleMetrics(req: express.Request, res: express.Response): Promise<void> {
    // TODO: Implement Prometheus metrics
    res.type('text/plain');
    res.send('# Metrics endpoint placeholder');
  }
  
  async start(): Promise<void> {
    try {
      // Initialize database
      const dbService = this.container.get<DatabaseService>(TYPES.DatabaseService);
      await dbService.connect();
      
      // Initialize cache
      const cacheService = this.container.get<CacheService>(TYPES.CacheService);
      await cacheService.ping();
      
      // Initialize ECNE
      const ecneService = this.container.get<ECNEService>(TYPES.ECNEService);
      await ecneService.initialize();
      
      // Initialize WebSocket server
      const wsServer = this.container.get<WebSocketServer>(TYPES.WebSocketManager);
      wsServer.initialize(this.httpServer);
      
      // Setup service event handlers
      this.setupServiceEventHandlers();
      
      // Start HTTP server
      const PORT = process.env.PORT || 3000;
      this.httpServer.listen(PORT, () => {
        logger.info(`TraderAI server started`, {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
        });
      });
      
      // Graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  
  private setupServiceEventHandlers(): void {
    const ecneService = this.container.get<ECNEService>(TYPES.ECNEService);
    const wsServer = this.container.get<WebSocketServer>(TYPES.WebSocketManager);
    const dbService = this.container.get<DatabaseService>(TYPES.DatabaseService);
    
    // Handle ECNE data events
    ecneService.on('data', async (data: any) => {
      try {
        // Save to database
        await dbService.saveMarketData({
          symbol: data.symbol,
          timestamp: new Date(data.timestamp),
          price: data.price,
          volume: BigInt(data.volume || 0),
          coherencePsi: data.coherence?.psi || 0,
          coherenceRho: data.coherence?.rho || 0,
          coherenceQ: data.coherence?.q || 0,
          coherenceF: data.coherence?.f || 0,
          sentiment: data.sentiment,
        });
        
        // Broadcast to WebSocket clients
        wsServer.broadcastMarketData(data.symbol, data);
      } catch (error) {
        logger.error('Error handling ECNE data:', error);
      }
    });
    
    // Handle coherence alerts
    ecneService.on('coherence-alert', async (alert: any) => {
      try {
        // Save alert to database
        await dbService.saveAlert(alert);
        
        // Broadcast alert
        wsServer.broadcastAlert(alert);
      } catch (error) {
        logger.error('Error handling coherence alert:', error);
      }
    });
  }
  
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      
      try {
        // Stop accepting new connections
        this.httpServer.close();
        
        // Close database connections
        const dbService = this.container.get<DatabaseService>(TYPES.DatabaseService);
        await dbService.disconnect();
        
        // Stop ECNE service
        const ecneService = this.container.get<ECNEService>(TYPES.ECNEService);
        await ecneService.stop();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the server
if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default Server;