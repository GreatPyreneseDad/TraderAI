import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { ClaudeService } from '../services/claude-service';
import { GCTService } from '../services/gct-service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Middleware to get services from app locals
const getServices = (req: Request) => {
  return {
    claudeService: req.app.locals.claudeService as ClaudeService,
    gctService: req.app.locals.gctService as GCTService
  };
};

// Generate inference with three angles
router.post('/generate', 
  [
    body('query').isString().notEmpty().withMessage('Query is required'),
    body('context').optional().isString(),
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('symbols').optional().isArray().withMessage('Symbols must be an array')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { query, context, userId, symbols } = req.body;
      const { claudeService } = getServices(req);

      // Get market data if symbols provided
      let marketData = null;
      let coherenceScores = null;
      
      if (symbols && symbols.length > 0) {
        try {
          // Get latest market data for symbols
          const marketDataResults = await prisma.marketData.findMany({
            where: {
              symbol: { in: symbols },
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            },
            orderBy: { timestamp: 'desc' },
            take: symbols.length
          });

          marketData = marketDataResults.reduce((acc: any, data) => {
            acc[data.symbol] = {
              price: data.price,
              volume: data.volume.toString(),
              coherenceScores: data.coherenceScores,
              sentiment: data.sentiment
            };
            return acc;
          }, {});

          // Calculate average coherence scores
          if (marketDataResults.length > 0) {
            const scores = marketDataResults.map(d => d.coherenceScores as any);
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

      // Generate inference using Claude
      const inferenceResponse = await claudeService.generateInference({
        query,
        context: context || `Market analysis request with coherence scores: ${JSON.stringify(coherenceScores)}`,
        marketData
      });

      // Create inference record
      const inference = await prisma.inference.create({
        data: {
          userId,
          query,
          context,
          conservative: inferenceResponse.conservative,
          progressive: inferenceResponse.progressive,
          synthetic: inferenceResponse.synthetic,
          status: 'COMPLETED'
        }
      });

      // If high coherence detected, trigger debate
      let debate = null;
      if (coherenceScores && (coherenceScores.psi > 0.7 || coherenceScores.rho > 0.7)) {
        try {
          const debateResponse = await claudeService.runDebate({
            symbol: symbols[0],
            question: query,
            marketData,
            coherenceScores
          });

          debate = await prisma.debate.create({
            data: {
              inferenceId: inference.id,
              symbol: symbols[0],
              question: query,
              bullArguments: debateResponse.bullArguments,
              bearArguments: debateResponse.bearArguments,
              judgeEvaluation: debateResponse.judgeEvaluation,
              winner: debateResponse.judgeEvaluation.winner === 'BULL' ? 'BULL' :
                     debateResponse.judgeEvaluation.winner === 'BEAR' ? 'BEAR' : 'NEUTRAL',
              confidence: debateResponse.judgeEvaluation.confidence
            }
          });
        } catch (error) {
          logger.error('Failed to run debate:', error);
        }
      }

      res.json({
        inference: {
          id: inference.id,
          query: inference.query,
          conservative: inference.conservative,
          progressive: inference.progressive,
          synthetic: inference.synthetic,
          debate: debate ? {
            id: debate.id,
            bullArguments: debate.bullArguments,
            bearArguments: debate.bearArguments,
            judgeEvaluation: debate.judgeEvaluation,
            winner: debate.winner,
            confidence: debate.confidence
          } : null
        },
        marketContext: {
          symbols,
          coherenceScores,
          marketData
        }
      });

    } catch (error) {
      logger.error('Inference generation error:', error);
      return next(error);
    }
  }
);

// Verify inference with human feedback
router.post('/verify',
  [
    body('inferenceId').isUUID().withMessage('Valid inference ID required'),
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('selectedOption').isIn(['conservative', 'progressive', 'synthetic', 'debate_winner']),
    body('rationale').optional().isString(),
    body('confidence').isFloat({ min: 0, max: 1 }).withMessage('Confidence must be between 0 and 1')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { inferenceId, userId, selectedOption, rationale, confidence } = req.body;

      // Verify inference exists
      const inference = await prisma.inference.findUnique({
        where: { id: inferenceId },
        include: { debate: true }
      });

      if (!inference) {
        return res.status(404).json({ error: 'Inference not found' });
      }

      // Create verification record
      const verification = await prisma.verification.create({
        data: {
          inferenceId,
          userId,
          selectedOption,
          rationale,
          confidence
        }
      });

      // Update inference with selected option
      await prisma.inference.update({
        where: { id: inferenceId },
        data: {
          selectedOption,
          confidence,
          status: 'COMPLETED'
        }
      });

      // Calculate verification statistics
      const allVerifications = await prisma.verification.findMany({
        where: { inferenceId }
      });

      const stats = {
        totalVerifications: allVerifications.length,
        optionDistribution: allVerifications.reduce((acc: any, v) => {
          acc[v.selectedOption] = (acc[v.selectedOption] || 0) + 1;
          return acc;
        }, {}),
        averageConfidence: allVerifications.reduce((sum, v) => sum + v.confidence, 0) / allVerifications.length
      };

      res.json({
        verification: {
          id: verification.id,
          selectedOption: verification.selectedOption,
          confidence: verification.confidence,
          createdAt: verification.createdAt
        },
        stats
      });

    } catch (error) {
      logger.error('Verification error:', error);
      return next(error);
    }
  }
);

// Get inference history for a user
router.get('/history/:userId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const inferences = await prisma.inference.findMany({
        where: { userId },
        include: {
          verifications: true,
          debate: true
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await prisma.inference.count({
        where: { userId }
      });

      res.json({
        inferences,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset)
        }
      });

    } catch (error) {
      logger.error('History fetch error:', error);
      return next(error);
    }
  }
);

// Submit feedback on inference quality
router.post('/feedback',
  [
    body('inferenceId').isUUID(),
    body('userId').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('feedback').optional().isString()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Store feedback (you might want to create a Feedback table)
      const { inferenceId, userId, rating } = req.body;
      
      logger.info('Feedback received:', { inferenceId, userId, rating });

      res.json({ 
        message: 'Feedback received successfully',
        rating
      });

    } catch (error) {
      logger.error('Feedback error:', error);
      return next(error);
    }
  }
);

export default router;