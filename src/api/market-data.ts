import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Get market data for a symbol
router.get('/market-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 100, timeframe = '24h' } = req.query;

    // Calculate time range
    const now = new Date();
    const startTime = new Date(now);
    
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
      default:
        startTime.setDate(now.getDate() - 1);
    }

    const marketData = await prisma.marketData.findMany({
      where: {
        symbol: symbol.toUpperCase(),
        timestamp: {
          gte: startTime
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: Number(limit)
    });

    // Convert BigInt to string for JSON serialization
    const serializedData = marketData.map(data => ({
      ...data,
      volume: data.volume.toString()
    }));

    res.json({
      symbol: symbol.toUpperCase(),
      timeframe,
      dataPoints: marketData.length,
      data: serializedData
    });

  } catch (error) {
    logger.error('Error fetching market data:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// Get all available symbols
router.get('/symbols', async (req, res) => {
  try {
    const symbols = await prisma.marketData.findMany({
      select: {
        symbol: true
      },
      distinct: ['symbol'],
      orderBy: {
        symbol: 'asc'
      }
    });

    res.json({
      symbols: symbols.map(s => s.symbol)
    });

  } catch (error) {
    logger.error('Error fetching symbols:', error);
    res.status(500).json({ error: 'Failed to fetch symbols' });
  }
});

// Get latest market overview
router.get('/overview', async (req, res) => {
  try {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'BTC'];
    const overview = [];

    for (const symbol of symbols) {
      const latest = await prisma.marketData.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      });

      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);

      const previousDay = await prisma.marketData.findFirst({
        where: {
          symbol,
          timestamp: { lte: dayAgo }
        },
        orderBy: { timestamp: 'desc' }
      });

      if (latest) {
        const change = previousDay ? 
          ((latest.price - previousDay.price) / previousDay.price) * 100 : 0;

        overview.push({
          symbol,
          price: latest.price,
          change: Math.round(change * 100) / 100,
          volume: latest.volume.toString(),
          coherenceScores: latest.coherenceScores,
          sentiment: latest.sentiment,
          timestamp: latest.timestamp
        });
      }
    }

    res.json({
      overview,
      lastUpdated: new Date()
    });

  } catch (error) {
    logger.error('Error fetching market overview:', error);
    res.status(500).json({ error: 'Failed to fetch market overview' });
  }
});

// Get alerts
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 10, severity, acknowledged = 'false' } = req.query;

    const where: any = {};
    if (severity) where.severity = severity;
    if (acknowledged === 'false') where.acknowledged = false;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    res.json({ alerts });

  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get market summary
router.get('/market/summary', async (req, res) => {
  try {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'BTC', 'ETH', 'SPY', 'QQQ', 'DIA'];
    const marketData = [];

    // Fetch latest data for all symbols
    for (const symbol of symbols) {
      const latest = await prisma.marketData.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      });

      // Get data from 24h ago for change calculation
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);

      const previousDay = await prisma.marketData.findFirst({
        where: {
          symbol,
          timestamp: { lte: dayAgo }
        },
        orderBy: { timestamp: 'desc' }
      });

      if (latest) {
        const priceChange = previousDay ? 
          ((latest.price - previousDay.price) / previousDay.price) * 100 : 0;
        
        const coherenceChange = previousDay && previousDay.coherenceScores ? 
          (((latest.coherenceScores as any).psi - (previousDay.coherenceScores as any).psi) / (previousDay.coherenceScores as any).psi) * 100 : 0;

        marketData.push({
          symbol,
          price: latest.price,
          priceChange: Math.round(priceChange * 100) / 100,
          coherenceChange: Math.round(coherenceChange * 100) / 100,
          volume: latest.volume.toString(),
          coherenceScores: latest.coherenceScores,
          timestamp: latest.timestamp
        });
      }
    }

    // Sort by coherence change to find top gainers/losers
    const sortedByCoherence = [...marketData].sort((a, b) => b.coherenceChange - a.coherenceChange);
    
    // Get unacknowledged alert count
    const criticalAlerts = await prisma.alert.count({
      where: {
        acknowledged: false,
        severity: { in: ['HIGH', 'CRITICAL'] }
      }
    });

    res.json({
      summary: {
        topGainers: sortedByCoherence.filter(s => s.coherenceChange > 0).slice(0, 3),
        topLosers: sortedByCoherence.filter(s => s.coherenceChange < 0).slice(-3).reverse(),
        criticalAlerts
      },
      symbols: marketData
    });
  } catch (error) {
    logger.error('Error fetching market summary:', error);
    res.status(500).json({ error: 'Failed to fetch market summary' });
  }
});

// Get coherence data
router.get('/market/coherence', async (req, res) => {
  try {
    const { symbols = 'AAPL,GOOGL,MSFT,AMZN,TSLA,META,NVDA,BTC,ETH,SPY,QQQ,DIA' } = req.query;
    const symbolList = (symbols as string).split(',');
    const symbolsData = {};

    for (const symbol of symbolList) {
      const latest = await prisma.marketData.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      });

      if (latest) {
        symbolsData[symbol] = {
          price: latest.price,
          volume: latest.volume.toString(),
          coherenceScores: latest.coherenceScores,
          current: latest.coherenceScores, // For backward compatibility
          timestamp: latest.timestamp
        };
      }
    }

    res.json({ symbols: symbolsData });
  } catch (error) {
    logger.error('Error fetching coherence data:', error);
    res.status(500).json({ error: 'Failed to fetch coherence data' });
  }
});

// Get system health
router.get('/health/services', async (req, res) => {
  try {
    const services = ['ecne', 'database', 'claude', 'websocket'];
    const health = [];

    for (const service of services) {
      const latest = await prisma.systemHealth.findFirst({
        where: { service },
        orderBy: { timestamp: 'desc' }
      });

      health.push({
        service,
        status: latest?.status || 'UNKNOWN',
        message: latest?.message || 'No data',
        lastCheck: latest?.timestamp || null
      });
    }

    res.json({ health });

  } catch (error) {
    logger.error('Error fetching system health:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

export default router;