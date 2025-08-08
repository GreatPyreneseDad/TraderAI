import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import marketRoutes from './api/market';
import inferenceRoutes from './api/inference';
import inferenceEnhancedRoutes from './api/inference-enhanced';
import debateRoutes from './api/debate';
import healthRoutes from './api/health';
import marketAnalysisRoutes from './api/market-analysis';

// Import services
import { ECNEService } from './services/ecne-service';
import { GCTService } from './services/gct-service';
import { ClaudeService } from './services/claude-service';
import { WebSocketManager } from './services/websocket-manager';
import { DatabaseService } from './services/database-service';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
let ecneService: ECNEService;
let gctService: GCTService;
let claudeService: ClaudeService;
let wsManager: WebSocketManager;
let dbService: DatabaseService;

async function initializeServices() {
  try {
    // Initialize database
    dbService = new DatabaseService();
    await dbService.connect();
    logger.info('Database connected successfully');

    // Initialize ECNE Data River
    ecneService = new ECNEService({
      maxConcurrent: parseInt(process.env.ECNE_MAX_CONCURRENT || '50'),
      batchSize: parseInt(process.env.ECNE_BATCH_SIZE || '100'),
      cacheMaxItems: parseInt(process.env.ECNE_CACHE_MAX_ITEMS || '10000'),
      cacheTTL: parseInt(process.env.ECNE_CACHE_TTL_SECONDS || '300')
    });
    await ecneService.initialize();
    logger.info('ECNE Data River initialized');

    // Initialize GCT Market Sentiment
    gctService = new GCTService({
      coherenceThresholds: {
        psi: parseFloat(process.env.GCT_COHERENCE_THRESHOLD_PSI || '0.7'),
        rho: parseFloat(process.env.GCT_COHERENCE_THRESHOLD_RHO || '0.6'),
        q: parseFloat(process.env.GCT_COHERENCE_THRESHOLD_Q || '0.5'),
        f: parseFloat(process.env.GCT_COHERENCE_THRESHOLD_F || '0.4')
      }
    });
    await gctService.initialize();
    logger.info('GCT Market Sentiment initialized');

    // Initialize Claude AI Service
    claudeService = new ClaudeService({
      apiKey: process.env.CLAUDE_API_KEY!
    });
    logger.info('Claude AI Service initialized');

    // Initialize WebSocket Manager
    wsManager = new WebSocketManager(io);
    wsManager.initialize();
    logger.info('WebSocket Manager initialized');

    // Connect services
    ecneService.on('data', (data) => {
      gctService.processMarketData(data);
      wsManager.broadcast('market-update', data);
    });

    gctService.on('coherence-alert', (alert) => {
      wsManager.broadcast('coherence-alert', alert);
      dbService.saveAlert(alert);
    });

    // Store services in app locals for access in routes
    app.locals.claudeService = claudeService;
    app.locals.gctService = gctService;
    app.locals.ecneService = ecneService;
    app.locals.dbService = dbService;

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/market', marketRoutes);
app.use('/api/market-analysis', marketAnalysisRoutes);
app.use('/api/inference', inferenceRoutes);
app.use('/api/inference-enhanced', inferenceEnhancedRoutes);
app.use('/api/debate', debateRoutes);
app.use('/api/health', healthRoutes);

// Static files for dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard/dist')));

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  await initializeServices();
  
  httpServer.listen(PORT, () => {
    logger.info(`TraderAI server running on port ${PORT}`);
    logger.info(`Dashboard available at http://localhost:${PORT}/dashboard`);
    logger.info(`WebSocket endpoint: ws://localhost:${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  
  if (ecneService) await ecneService.shutdown();
  if (gctService) await gctService.shutdown();
  if (dbService) await dbService.disconnect();
  
  process.exit(0);
});

// Start the application
start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});