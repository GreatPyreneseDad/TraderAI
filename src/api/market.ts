import { Router, Request, Response, NextFunction } from 'express';
import { query, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { ECNEService } from '../services/ecne-service';
import { GCTService } from '../services/gct-service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Get coherence scores for multiple symbols
router.get('/coherence',
  [
    query('symbols').isString().withMessage('Symbols parameter required'),
    query('timeframe').optional().isIn(['1h', '24h', '7d', '30d']).withMessage('Invalid timeframe')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const symbols = req.query.symbols as string;
      const timeframe = req.query.timeframe as string || '24h';
      const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());

      // Calculate time range
      const now = new Date();
      const startTime = new Date();
      switch (timeframe) {
        case '1h':
          startTime.setHours(now.getHours() - 1);
          break;
        case '24h':
          startTime.setDate(now.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(now.getDate() - 30);
          break;
      }

      // Get market data for symbols
      const marketData = await prisma.marketData.findMany({
        where: {
          symbol: { in: symbolList },
          timestamp: { gte: startTime }
        },
        orderBy: { timestamp: 'desc' }
      });

      // Group by symbol and calculate average coherence
      const coherenceBySymbol = symbolList.reduce((acc: any, symbol) => {
        const symbolData = marketData.filter(d => d.symbol === symbol);
        if (symbolData.length === 0) {
          acc[symbol] = null;
          return acc;
        }

        const latestData = symbolData[0];
        const scores = symbolData.map(d => d.coherenceScores as any);
        
        acc[symbol] = {
          current: latestData.coherenceScores,
          average: {
            psi: scores.reduce((sum, s) => sum + s.psi, 0) / scores.length,
            rho: scores.reduce((sum, s) => sum + s.rho, 0) / scores.length,
            q: scores.reduce((sum, s) => sum + s.q, 0) / scores.length,
            f: scores.reduce((sum, s) => sum + s.f, 0) / scores.length
          },
          price: latestData.price,
          volume: latestData.volume.toString(),
          sentiment: latestData.sentiment,
          dataPoints: symbolData.length,
          lastUpdate: latestData.timestamp
        };
        return acc;
      }, {});

      res.json({
        symbols: coherenceBySymbol,
        timeframe,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Coherence fetch error:', error);
      next(error);
    }
  }
);

// Get detailed data for a specific symbol
router.get('/symbols/:symbol',
  [
    param('symbol').isString().isLength({ min: 1, max: 10 }),
    query('period').optional().isIn(['1h', '24h', '7d', '30d'])
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const symbol = req.params.symbol.toUpperCase();
      const period = req.query.period as string || '24h';

      // Calculate time range
      const endTime = new Date();
      const startTime = new Date();
      switch (period) {
        case '1h':
          startTime.setHours(endTime.getHours() - 1);
          break;
        case '24h':
          startTime.setDate(endTime.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(endTime.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(endTime.getDate() - 30);
          break;
      }

      // Get historical data
      const historicalData = await prisma.marketData.findMany({
        where: {
          symbol,
          timestamp: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      if (historicalData.length === 0) {
        return res.status(404).json({ error: 'No data found for symbol' });
      }

      // Get recent alerts
      const alerts = await prisma.alert.findMany({
        where: {
          symbol,
          createdAt: { gte: startTime }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Calculate statistics
      const prices = historicalData.map(d => d.price);
      const coherenceScores = historicalData.map(d => d.coherenceScores as any);
      
      const stats = {
        price: {
          current: prices[prices.length - 1],
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: prices.reduce((a, b) => a + b, 0) / prices.length,
          change: ((prices[prices.length - 1] - prices[0]) / prices[0] * 100).toFixed(2) + '%'
        },
        coherence: {
          current: coherenceScores[coherenceScores.length - 1],
          averages: {
            psi: coherenceScores.reduce((sum, s) => sum + s.psi, 0) / coherenceScores.length,
            rho: coherenceScores.reduce((sum, s) => sum + s.rho, 0) / coherenceScores.length,
            q: coherenceScores.reduce((sum, s) => sum + s.q, 0) / coherenceScores.length,
            f: coherenceScores.reduce((sum, s) => sum + s.f, 0) / coherenceScores.length
          }
        }
      };

      res.json({
        symbol,
        period,
        stats,
        data: historicalData.map(d => ({
          timestamp: d.timestamp,
          price: d.price,
          volume: d.volume.toString(),
          coherenceScores: d.coherenceScores,
          sentiment: d.sentiment
        })),
        alerts: alerts.map(a => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          title: a.title,
          message: a.message,
          timestamp: a.createdAt
        }))
      });

    } catch (error) {
      logger.error('Symbol data fetch error:', error);
      next(error);
    }
  }
);

// Subscribe to real-time updates
router.post('/subscribe',
  [
    query('symbols').isString().withMessage('Symbols parameter required')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const symbols = req.query.symbols as string;
      const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
      
      const ecneService = req.app.locals.ecneService as ECNEService;

      // Process symbols through ECNE
      await ecneService.processSymbols(symbolList);

      res.json({
        message: 'Subscribed to symbols',
        symbols: symbolList
      });

    } catch (error) {
      logger.error('Subscribe error:', error);
      next(error);
    }
  }
);

// Get market alerts
router.get('/alerts',
  [
    query('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('acknowledged').optional().isBoolean()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { severity, limit = 20, acknowledged = false } = req.query;

      const where: any = {
        acknowledged: acknowledged === 'true'
      };

      if (severity) {
        where.severity = severity;
      }

      const alerts = await prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      });

      res.json({
        alerts: alerts.map(a => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          symbol: a.symbol,
          title: a.title,
          message: a.message,
          data: a.data,
          acknowledged: a.acknowledged,
          timestamp: a.createdAt
        })),
        total: alerts.length
      });

    } catch (error) {
      logger.error('Alerts fetch error:', error);
      next(error);
    }
  }
);

// Acknowledge an alert
router.put('/alerts/:id/acknowledge',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const alert = await prisma.alert.update({
        where: { id },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: userId
        }
      });

      res.json({
        message: 'Alert acknowledged',
        alert
      });

    } catch (error) {
      logger.error('Alert acknowledge error:', error);
      next(error);
    }
  }
);

// Get market summary
router.get('/summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get top movers by coherence change
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Get latest data for all symbols
      const latestData = await prisma.marketData.findMany({
        where: {
          timestamp: { gte: oneDayAgo }
        },
        distinct: ['symbol'],
        orderBy: { timestamp: 'desc' }
      });

      // Calculate coherence changes
      const topMovers = await Promise.all(
        latestData.map(async (current) => {
          const previous = await prisma.marketData.findFirst({
            where: {
              symbol: current.symbol,
              timestamp: { lt: oneDayAgo }
            },
            orderBy: { timestamp: 'desc' }
          });

          if (!previous) return null;

          const currentScores = current.coherenceScores as any;
          const previousScores = previous.coherenceScores as any;
          
          const coherenceChange = (
            (currentScores.psi - previousScores.psi) +
            (currentScores.rho - previousScores.rho) +
            (currentScores.q - previousScores.q) +
            (currentScores.f - previousScores.f)
          ) / 4;

          return {
            symbol: current.symbol,
            price: current.price,
            priceChange: ((current.price - previous.price) / previous.price * 100).toFixed(2) + '%',
            coherenceChange: (coherenceChange * 100).toFixed(2) + '%',
            currentCoherence: currentScores,
            volume: current.volume.toString()
          };
        })
      );

      // Filter and sort top movers
      const validMovers = topMovers.filter(m => m !== null);
      const topGainers = validMovers.sort((a, b) => 
        parseFloat(b!.coherenceChange) - parseFloat(a!.coherenceChange)
      ).slice(0, 5);
      const topLosers = validMovers.sort((a, b) => 
        parseFloat(a!.coherenceChange) - parseFloat(b!.coherenceChange)
      ).slice(0, 5);

      // Get recent critical alerts
      const criticalAlerts = await prisma.alert.findMany({
        where: {
          severity: 'CRITICAL',
          acknowledged: false
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      res.json({
        summary: {
          totalSymbols: latestData.length,
          topGainers,
          topLosers,
          criticalAlerts: criticalAlerts.length,
          lastUpdate: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Summary fetch error:', error);
      next(error);
    }
  }
);

export default router;