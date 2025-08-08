import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { ClaudeService } from '../services/claude-service';
import { GCTService } from '../services/gct-service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// PandasAI service URL
const PANDAS_AI_SERVICE_URL = process.env.PANDAS_AI_SERVICE_URL || 'http://localhost:8001';

// Middleware to get services from app locals
const getServices = (req: Request) => {
  return {
    claudeService: req.app.locals.claudeService as ClaudeService,
    gctService: req.app.locals.gctService as GCTService
  };
};

// Enhanced inference generation with PandasAI analysis
router.post('/generate-enhanced',
  [
    body('query').isString().notEmpty().withMessage('Query is required'),
    body('context').optional().isString(),
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('symbols').optional().isArray().withMessage('Symbols must be an array'),
    body('analysisQuery').optional().isString().withMessage('Analysis query must be a string')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { query, context, userId, symbols, analysisQuery } = req.body;
      const { claudeService } = getServices(req);

      // Step 1: Perform PandasAI analysis if requested
      let dataAnalysis = null;
      let marketInsights = null;

      if (symbols && symbols.length > 0 && analysisQuery) {
        try {
          logger.info('Performing PandasAI analysis', { symbols, analysisQuery });
          
          // Get analysis from PandasAI service
          const analysisResponse = await axios.post(
            `${PANDAS_AI_SERVICE_URL}/analyze`,
            {
              query: analysisQuery,
              symbols,
              timeframe: '24h',
              use_cache: true
            },
            {
              headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json'
              },
              timeout: 20000
            }
          );

          if (analysisResponse.data.success) {
            dataAnalysis = analysisResponse.data.result;
            
            // Extract key insights
            marketInsights = {
              symbols: analysisResponse.data.metadata?.symbols || symbols,
              rowsAnalyzed: analysisResponse.data.metadata?.rows_analyzed || 0,
              analysis: dataAnalysis,
              timestamp: new Date().toISOString()
            };
          }
        } catch (error) {
          logger.error('PandasAI analysis failed:', error);
          // Continue without analysis rather than failing
        }
      }

      // Step 2: Get market data and coherence scores
      let marketData = null;
      let coherenceScores = null;
      
      if (symbols && symbols.length > 0) {
        try {
          const marketDataResults = await prisma.marketData.findMany({
            where: {
              symbol: { in: symbols },
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            },
            orderBy: { timestamp: 'desc' },
            take: symbols.length * 10 // Get more data points
          });

          // Group by symbol and get latest
          marketData = {};
          const latestBySymbol = new Map();
          
          marketDataResults.forEach(data => {
            if (!latestBySymbol.has(data.symbol) || 
                data.timestamp > latestBySymbol.get(data.symbol).timestamp) {
              latestBySymbol.set(data.symbol, data);
            }
          });

          latestBySymbol.forEach((data, symbol) => {
            marketData[symbol] = {
              price: data.price,
              volume: data.volume.toString(),
              coherenceScores: data.coherenceScores,
              sentiment: data.sentiment,
              timestamp: data.timestamp
            };
          });

          // Calculate average coherence scores
          if (marketDataResults.length > 0) {
            const scores = Array.from(latestBySymbol.values()).map(d => d.coherenceScores as any);
            coherenceScores = {
              psi: scores.reduce((sum, s) => sum + s.psi, 0) / scores.length,
              rho: scores.reduce((sum, s) => sum + s.rho, 0) / scores.length,
              q: scores.reduce((sum, s) => sum + s.q, 0) / scores.length,
              f: scores.reduce((sum, s) => sum + s.f, 0) / scores.length
            };
          }
        } catch (error) {
          logger.error('Failed to fetch market data:', error);
        }
      }

      // Step 3: Build enhanced context
      const enhancedContext = {
        originalContext: context,
        dataAnalysis: dataAnalysis ? {
          summary: typeof dataAnalysis === 'string' ? dataAnalysis : JSON.stringify(dataAnalysis),
          insights: marketInsights
        } : null,
        marketData,
        coherenceScores,
        timestamp: new Date().toISOString()
      };

      // Step 4: Generate enhanced inference with Claude
      const inferenceResponse = await claudeService.generateInference({
        query,
        context: JSON.stringify(enhancedContext),
        marketData
      });

      // Step 5: Create inference record with enhanced data
      const inference = await prisma.inference.create({
        data: {
          userId,
          query,
          context: JSON.stringify(enhancedContext),
          conservative: inferenceResponse.conservative,
          progressive: inferenceResponse.progressive,
          synthetic: inferenceResponse.synthetic,
          status: 'COMPLETED'
          // TODO: Add metadata field to schema
          // metadata: {
          //   enhanced: true,
          //   hasDataAnalysis: !!dataAnalysis,
          //   analysisQuery: analysisQuery || null,
          //   symbols: symbols || [],
          //   coherenceScores
          // }
        }
      });

      // Step 6: If high coherence detected, trigger debate
      if (coherenceScores && Math.max(...Object.values(coherenceScores)) > 0.8) {
        logger.info('High coherence detected, triggering debate', { 
          inferenceId: inference.id,
          coherenceScores 
        });
      }

      // Step 7: Generate automated insights if requested
      let automatedInsights = null;
      if (symbols && symbols.length > 0) {
        try {
          const insightsResponse = await axios.post(
            `${PANDAS_AI_SERVICE_URL}/insights`,
            { symbols },
            {
              headers: { 'Authorization': req.headers.authorization },
              timeout: 30000
            }
          );
          automatedInsights = insightsResponse.data;
        } catch (error) {
          logger.warn('Failed to generate automated insights:', error);
        }
      }

      res.json({
        inference: {
          id: inference.id,
          query: inference.query,
          conservative: inference.conservative,
          progressive: inference.progressive,
          synthetic: inference.synthetic,
          createdAt: inference.createdAt
        },
        analysis: dataAnalysis ? {
          result: dataAnalysis,
          insights: marketInsights  // renamed from metadata
        } : null,
        marketData: {
          symbols,
          coherenceScores,
          marketData
        },
        insights: automatedInsights
      });

    } catch (error) {
      logger.error('Enhanced inference generation error:', error);
      return next(error);
    }
  }
);

// Generate inference with anomaly detection
router.post('/generate-with-anomalies',
  [
    body('query').isString().notEmpty(),
    body('userId').isUUID(),
    body('symbols').optional().isArray()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, userId, symbols } = req.body;
      const { claudeService } = getServices(req);

      // First, detect anomalies
      let anomalies = null;
      if (symbols && symbols.length > 0) {
        try {
          const anomalyResponse = await axios.post(
            `${PANDAS_AI_SERVICE_URL}/anomalies`,
            { symbols },
            {
              headers: { 'Authorization': req.headers.authorization },
              timeout: 20000
            }
          );
          
          if (anomalyResponse.data.success) {
            anomalies = anomalyResponse.data.anomalies;
          }
        } catch (error) {
          logger.error('Anomaly detection failed:', error);
        }
      }

      // Include anomalies in context
      const contextWithAnomalies = {
        query,
        anomaliesDetected: anomalies || [],
        hasAnomalies: !!(anomalies && anomalies.length > 0)
      };

      // Generate inference with anomaly context
      const inferenceResponse = await claudeService.generateInference({
        query,
        context: JSON.stringify(contextWithAnomalies),
        marketData: null
      });

      const inference = await prisma.inference.create({
        data: {
          userId,
          query,
          context: JSON.stringify(contextWithAnomalies),
          conservative: inferenceResponse.conservative,
          progressive: inferenceResponse.progressive,
          synthetic: inferenceResponse.synthetic,
          status: 'COMPLETED'
          // TODO: Add metadata field to schema
          // metadata: {
          //   hasAnomalies: contextWithAnomalies.hasAnomalies,
          //   anomalyCount: anomalies?.length || 0
          // }
        }
      });

      res.json({
        inference: {
          id: inference.id,
          query: inference.query,
          conservative: inference.conservative,
          progressive: inference.progressive,
          synthetic: inference.synthetic,
          createdAt: inference.createdAt
        },
        anomalies
      });

    } catch (error) {
      logger.error('Anomaly-enhanced inference error:', error);
      return next(error);
    }
  }
);

// Generate trading signals with inference
router.post('/generate-with-signals',
  [
    body('strategy').isString().notEmpty(),
    body('symbols').isArray({ min: 1 }),
    body('userId').isUUID()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { strategy, symbols, userId } = req.body;
      const { claudeService } = getServices(req);

      // Get trading signals
      let signals = null;
      try {
        const signalsResponse = await axios.post(
          `${PANDAS_AI_SERVICE_URL}/signals`,
          { strategy, symbols },
          {
            headers: { 'Authorization': req.headers.authorization },
            timeout: 25000
          }
        );
        
        if (signalsResponse.data.success) {
          signals = signalsResponse.data.signals;
        }
      } catch (error) {
        logger.error('Signal generation failed:', error);
      }

      // Generate inference based on signals
      const query = `Based on ${strategy} strategy, what are the trading opportunities for ${symbols.join(', ')}?`;
      
      const inferenceResponse = await claudeService.generateInference({
        query,
        context: JSON.stringify({
          strategy,
          symbols,
          signals: signals || 'No signals generated'
        }),
        marketData: null
      });

      const inference = await prisma.inference.create({
        data: {
          userId,
          query,
          context: JSON.stringify({ strategy, symbols, signals }),
          conservative: inferenceResponse.conservative,
          progressive: inferenceResponse.progressive,
          synthetic: inferenceResponse.synthetic,
          status: 'COMPLETED'
          // TODO: Add metadata field to schema
          // metadata: {
          //   strategy,
          //   hasSignals: !!signals
          // }
        }
      });

      res.json({
        inference: {
          id: inference.id,
          query: inference.query,
          conservative: inference.conservative,
          progressive: inference.progressive,
          synthetic: inference.synthetic,
          createdAt: inference.createdAt
        },
        signals
      });

    } catch (error) {
      logger.error('Signal-enhanced inference error:', error);
      return next(error);
    }
  }
);

export default router;