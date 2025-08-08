import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// PandasAI service URL
const PANDAS_AI_SERVICE_URL = process.env.PANDAS_AI_SERVICE_URL || 'http://localhost:8001';

// Validation middleware
const validateAnalysisRequest = [
  body('query').isString().isLength({ min: 1, max: 1000 }).withMessage('Query must be between 1 and 1000 characters'),
  body('symbols').optional().isArray().withMessage('Symbols must be an array'),
  body('symbols.*').optional().isString().isUppercase().isLength({ min: 1, max: 5 }).withMessage('Invalid symbol format'),
  body('timeframe').optional().isIn(['1h', '24h', '7d', '30d']).withMessage('Invalid timeframe'),
  body('useCache').optional().isBoolean().withMessage('useCache must be a boolean')
];

// Natural language market analysis endpoint
router.post('/query',
  validateAnalysisRequest,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { query, symbols, timeframe = '24h', useCache = true } = req.body;
      
      logger.info('Market analysis query', {
        userId: req.user?.id,
        query: query.substring(0, 50) + '...',
        symbols,
        timeframe
      });

      // Forward request to PandasAI service
      const response = await axios.post(
        `${PANDAS_AI_SERVICE_URL}/analyze`,
        {
          query,
          symbols,
          timeframe,
          use_cache: useCache
        },
        {
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      // Log successful analysis
      logger.info('Market analysis completed', {
        userId: req.user?.id,
        success: response.data.success,
        rowsAnalyzed: response.data.metadata?.rows_analyzed
      });

      res.json(response.data);

    } catch (error: any) {
      logger.error('Market analysis error:', error);
      
      if (error.response) {
        // Forward error from PandasAI service
        return res.status(error.response.status).json(error.response.data);
      }
      
      return next(error);
    }
  }
);

// Generate market insights endpoint
router.post('/insights',
  [
    body('symbols').isArray({ min: 1 }).withMessage('At least one symbol required'),
    body('symbols.*').isString().isUppercase().isLength({ min: 1, max: 5 }).withMessage('Invalid symbol format')
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { symbols } = req.body;

      const response = await axios.post(
        `${PANDAS_AI_SERVICE_URL}/insights`,
        { symbols },
        {
          headers: {
            'Authorization': req.headers.authorization
          },
          timeout: 45000 // 45 second timeout for insights
        }
      );

      res.json(response.data);

    } catch (error: any) {
      logger.error('Insights generation error:', error);
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return next(error);
    }
  }
);

// Detect anomalies endpoint
router.post('/anomalies',
  [
    body('symbols').optional().isArray().withMessage('Symbols must be an array')
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { symbols } = req.body;

      const response = await axios.post(
        `${PANDAS_AI_SERVICE_URL}/anomalies`,
        { symbols },
        {
          headers: {
            'Authorization': req.headers.authorization
          },
          timeout: 30000
        }
      );

      res.json(response.data);

    } catch (error: any) {
      logger.error('Anomaly detection error:', error);
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return next(error);
    }
  }
);

// Generate trading signals endpoint
router.post('/signals',
  [
    body('strategy').isString().isLength({ min: 1, max: 100 }).withMessage('Strategy name required'),
    body('symbols').isArray({ min: 1 }).withMessage('At least one symbol required')
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { strategy, symbols } = req.body;

      const response = await axios.post(
        `${PANDAS_AI_SERVICE_URL}/signals`,
        { strategy, symbols },
        {
          headers: {
            'Authorization': req.headers.authorization
          },
          timeout: 30000
        }
      );

      res.json(response.data);

    } catch (error: any) {
      logger.error('Signal generation error:', error);
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return next(error);
    }
  }
);

// Get query suggestions endpoint
router.get('/suggestions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { context } = req.query;

      const response = await axios.get(
        `${PANDAS_AI_SERVICE_URL}/suggestions`,
        {
          params: { context },
          timeout: 5000
        }
      );

      res.json(response.data);

    } catch (error: any) {
      logger.error('Suggestions fetch error:', error);
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return next(error);
    }
  }
);

// Batch analysis endpoint for multiple queries
router.post('/batch',
  [
    body('queries').isArray({ min: 1, max: 10 }).withMessage('Between 1 and 10 queries allowed'),
    body('queries.*.query').isString().isLength({ min: 1, max: 1000 }),
    body('queries.*.symbols').optional().isArray(),
    body('timeframe').optional().isIn(['1h', '24h', '7d', '30d'])
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { queries, timeframe = '24h' } = req.body;
      
      // Process queries in parallel
      const promises = queries.map((q: any) => 
        axios.post(
          `${PANDAS_AI_SERVICE_URL}/analyze`,
          {
            query: q.query,
            symbols: q.symbols,
            timeframe,
            use_cache: true
          },
          {
            headers: {
              'Authorization': req.headers.authorization
            },
            timeout: 30000
          }
        ).catch(error => ({
          error: true,
          message: error.message,
          query: q.query
        }))
      );

      const results = await Promise.all(promises);

      res.json({
        success: true,
        results: results.map((r: any, index: number) => ({
          ...r.data || r,
          originalQuery: queries[index]
        })),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Batch analysis error:', error);
      return next(error);
    }
  }
);

export default router;