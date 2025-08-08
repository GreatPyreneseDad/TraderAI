import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { ClaudeService } from '../services/claude-service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Trigger debate analysis for a market question
router.post('/analyze',
  [
    body('symbol').isString().notEmpty().withMessage('Symbol is required'),
    body('question').isString().notEmpty().withMessage('Question is required'),
    body('userId').isUUID().withMessage('Valid user ID required')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { symbol, question, userId } = req.body;
      const claudeService = req.app.locals.claudeService as ClaudeService;

      // Get latest market data
      const marketData = await prisma.marketData.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      });

      if (!marketData) {
        return res.status(404).json({ error: 'No market data found for symbol' });
      }

      // Run the debate
      const debateResponse = await claudeService.runDebate({
        symbol,
        question,
        marketData: {
          price: marketData.price,
          volume: marketData.volume.toString(),
          sentiment: marketData.sentiment
        },
        coherenceScores: marketData.coherenceScores as any
      });

      // Create a dummy inference for the debate (or link to existing)
      const inference = await prisma.inference.create({
        data: {
          userId,
          query: question,
          context: `Market debate for ${symbol}`,
          conservative: { answer: 'N/A', confidence: 0, reasoning: 'Debate only' },
          progressive: { answer: 'N/A', confidence: 0, reasoning: 'Debate only' },
          synthetic: { answer: 'N/A', confidence: 0, reasoning: 'Debate only' },
          status: 'COMPLETED'
        }
      });

      // Save debate
      const debate = await prisma.debate.create({
        data: {
          inferenceId: inference.id,
          symbol,
          question,
          bullArguments: debateResponse.bullArguments,
          bearArguments: debateResponse.bearArguments,
          judgeEvaluation: debateResponse.judgeEvaluation,
          winner: debateResponse.judgeEvaluation.winner === 'BULL' ? 'BULL' :
                 debateResponse.judgeEvaluation.winner === 'BEAR' ? 'BEAR' : 'NEUTRAL',
          confidence: debateResponse.judgeEvaluation.confidence
        }
      });

      res.json({
        debate: {
          id: debate.id,
          symbol: debate.symbol,
          question: debate.question,
          bullArguments: debate.bullArguments,
          bearArguments: debate.bearArguments,
          judgeEvaluation: debate.judgeEvaluation,
          winner: debate.winner,
          confidence: debate.confidence,
          createdAt: debate.createdAt
        },
        marketContext: {
          price: marketData.price,
          coherenceScores: marketData.coherenceScores
        }
      });

    } catch (error) {
      logger.error('Debate analysis error:', error);
      return next(error);
    }
  }
);

// Get debate results by ID
router.get('/results/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const debate = await prisma.debate.findUnique({
        where: { id },
        include: {
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          }
        }
      });

      if (!debate) {
        return res.status(404).json({ error: 'Debate not found' });
      }

      // Calculate vote statistics
      const voteStats = debate.votes.reduce((acc: any, vote) => {
        acc[vote.votedFor] = (acc[vote.votedFor] || 0) + 1;
        return acc;
      }, { BULL: 0, BEAR: 0, NEUTRAL: 0 });

      res.json({
        debate,
        stats: {
          totalVotes: debate.votes.length,
          voteDistribution: voteStats,
          humanAgreement: debate.votes.length > 0 
            ? (voteStats[debate.winner] / debate.votes.length * 100).toFixed(1) + '%'
            : 'N/A'
        }
      });

    } catch (error) {
      logger.error('Debate results error:', error);
      return next(error);
    }
  }
);

// Cast vote on debate outcome
router.post('/vote',
  [
    body('debateId').isUUID().withMessage('Valid debate ID required'),
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('votedFor').isIn(['BULL', 'BEAR', 'NEUTRAL']).withMessage('Vote must be BULL, BEAR, or NEUTRAL'),
    body('rationale').optional().isString()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { debateId, userId, votedFor, rationale } = req.body;

      // Check if debate exists
      const debate = await prisma.debate.findUnique({
        where: { id: debateId }
      });

      if (!debate) {
        return res.status(404).json({ error: 'Debate not found' });
      }

      // Create or update vote
      const vote = await prisma.debateVote.upsert({
        where: {
          debateId_userId: {
            debateId,
            userId
          }
        },
        update: {
          votedFor,
          rationale
        },
        create: {
          debateId,
          userId,
          votedFor,
          rationale
        }
      });

      // Get updated vote statistics
      const allVotes = await prisma.debateVote.findMany({
        where: { debateId }
      });

      const voteStats = allVotes.reduce((acc: any, v) => {
        acc[v.votedFor] = (acc[v.votedFor] || 0) + 1;
        return acc;
      }, { BULL: 0, BEAR: 0, NEUTRAL: 0 });

      res.json({
        vote: {
          id: vote.id,
          votedFor: vote.votedFor,
          createdAt: vote.createdAt
        },
        stats: {
          totalVotes: allVotes.length,
          voteDistribution: voteStats,
          aiJudgeAgreement: voteStats[debate.winner] / allVotes.length * 100
        }
      });

    } catch (error) {
      logger.error('Vote error:', error);
      return next(error);
    }
  }
);

// Get debate leaderboard (agent performance)
router.get('/leaderboard',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { period = '7d' } = req.query;

      // Calculate date range
      const startDate = new Date();
      if (period === '24h') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (period === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      }

      // Get debates with votes
      const debates = await prisma.debate.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        include: {
          votes: true
        }
      });

      // Calculate agent performance
      const agentStats = {
        bull: { wins: 0, totalDebates: 0, humanAgreement: 0 },
        bear: { wins: 0, totalDebates: 0, humanAgreement: 0 },
        judge: { accuracy: 0, totalDebates: debates.length }
      };

      debates.forEach(debate => {
        // Count wins
        if (debate.winner === 'BULL') {
          agentStats.bull.wins++;
        } else if (debate.winner === 'BEAR') {
          agentStats.bear.wins++;
        }

        agentStats.bull.totalDebates++;
        agentStats.bear.totalDebates++;

        // Calculate human agreement
        if (debate.votes.length > 0) {
          const bullVotes = debate.votes.filter(v => v.votedFor === 'BULL').length;
          const bearVotes = debate.votes.filter(v => v.votedFor === 'BEAR').length;
          
          if (debate.winner === 'BULL' && bullVotes > bearVotes) {
            agentStats.judge.accuracy++;
          } else if (debate.winner === 'BEAR' && bearVotes > bullVotes) {
            agentStats.judge.accuracy++;
          }
        }
      });

      // Calculate percentages
      if (agentStats.bull.totalDebates > 0) {
        agentStats.bull.humanAgreement = (agentStats.bull.wins / agentStats.bull.totalDebates) * 100;
      }
      if (agentStats.bear.totalDebates > 0) {
        agentStats.bear.humanAgreement = (agentStats.bear.wins / agentStats.bear.totalDebates) * 100;
      }
      if (agentStats.judge.totalDebates > 0) {
        agentStats.judge.accuracy = (agentStats.judge.accuracy / agentStats.judge.totalDebates) * 100;
      }

      res.json({
        period,
        totalDebates: debates.length,
        agentPerformance: {
          bullAgent: {
            winRate: `${agentStats.bull.humanAgreement.toFixed(1)}%`,
            totalWins: agentStats.bull.wins,
            totalDebates: agentStats.bull.totalDebates
          },
          bearAgent: {
            winRate: `${agentStats.bear.humanAgreement.toFixed(1)}%`,
            totalWins: agentStats.bear.wins,
            totalDebates: agentStats.bear.totalDebates
          },
          judgeAgent: {
            humanAgreementRate: `${agentStats.judge.accuracy.toFixed(1)}%`,
            totalJudgments: agentStats.judge.totalDebates
          }
        }
      });

    } catch (error) {
      logger.error('Leaderboard error:', error);
      next(error);
    }
  }
);

export default router;