import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AuthMiddleware {
  private rateLimiter: RateLimiterRedis;
  
  constructor(private redis: Redis) {
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl',
      points: 100, // requests
      duration: 900, // per 15 minutes
      blockDuration: 900, // block for 15 minutes
    });
  }
  
  async authenticate(
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<void> {
    try {
      const token = this.extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }
      
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'your-secret-key',
        { algorithms: ['HS256'] }
      ) as any;
      
      // Rate limiting per user
      await this.rateLimiter.consume(decoded.id);
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
      
      next();
    } catch (error: any) {
      if (error.name === 'RateLimiterRes') {
        res.status(429).json({ 
          error: 'Too many requests',
          retryAfter: Math.round(error.msBeforeNext / 1000) || 60,
        });
        return;
      }
      
      res.status(401).json({ error: 'Invalid token' });
    }
  }
  
  authorize(roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      
      next();
    };
  }
  
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}