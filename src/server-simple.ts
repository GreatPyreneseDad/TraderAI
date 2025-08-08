import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
// import { Server } from 'socket.io';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import healthRoutes from './api/health';

// Import services
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);
// WebSocket server disabled for simplified mode
// const io = new Server(httpServer, {
//   cors: {
//     origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
//     methods: ['GET', 'POST']
//   }
// });

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple mock services for testing
const mockClaudeService = {
  generateInference: async (query: string) => ({
    conservative: { answer: 'Conservative view on ' + query, confidence: 0.8, reasoning: 'Based on historical data' },
    progressive: { answer: 'Progressive view on ' + query, confidence: 0.85, reasoning: 'Based on trends' },
    synthetic: { answer: 'Synthetic view on ' + query, confidence: 0.9, reasoning: 'Balanced perspective' }
  }),
  runDebate: async (_params: any) => ({
    bullArguments: ['Bull point 1', 'Bull point 2'],
    bearArguments: ['Bear point 1', 'Bear point 2'],
    judgeEvaluation: { winner: 'BULL', confidence: 0.75, reasoning: 'Bull case stronger' }
  })
};

const mockGCTService = {
  processMarketData: async (_data: any) => ({ processed: true }),
  getCoherence: async () => ({ psi: 0.7, rho: 0.6, q: 0.5, f: 0.4 })
};

const mockECNEService = {
  start: async () => logger.info('Mock ECNE started'),
  shutdown: async () => logger.info('Mock ECNE shutdown'),
  on: (_event: string, _handler: Function) => {}
};

const mockDBService = {
  connect: async () => logger.info('Mock DB connected'),
  disconnect: async () => logger.info('Mock DB disconnected'),
  saveAlert: async (alert: any) => ({ id: '123', ...alert })
};

// Store mock services in app locals
app.locals.claudeService = mockClaudeService;
app.locals.gctService = mockGCTService;
app.locals.ecneService = mockECNEService;
app.locals.dbService = mockDBService;

// Basic root route
app.get('/', (_req, res) => {
  res.json({
    message: 'TraderAI API Server',
    version: '1.0.0',
    status: 'running',
    mode: 'simplified-testing'
  });
});

// Routes (commented out for now to avoid DB dependencies)
// app.use('/api/market', marketRoutes);
// app.use('/api/inference', inferenceRoutes);
// app.use('/api/debate', debateRoutes);
app.use('/api/health', healthRoutes);

// Simple health check
app.get('/api/test', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      database: 'mocked',
      redis: 'mocked',
      ecne: 'mocked',
      gct: 'mocked',
      claude: 'mocked'
    }
  });
});

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

httpServer.listen(PORT, () => {
  logger.info(`TraderAI server (simplified mode) running on port ${PORT}`);
  logger.info(`Test the API at http://localhost:${PORT}/api/test`);
  logger.info(`Health check at http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  process.exit(0);
});