import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import { createHash } from 'crypto';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Global rate limiter
const globalRateLimiter = new RateLimiterMemory({
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
});

export const securityMiddleware = [
  // Helmet for security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
  
  // Global rate limiting
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await globalRateLimiter.consume(req.ip);
      next();
    } catch (rejRes) {
      res.status(429).send('Too Many Requests');
    }
  },
  
  // API key validation for external services
  (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/external')) {
      const apiKey = req.headers['x-api-key'] as string;
      if (!apiKey) {
        res.status(401).json({ error: 'API key required' });
        return;
      }
      
      const hashedKey = createHash('sha256').update(apiKey).digest('hex');
      const validKeys = (process.env.VALID_API_KEYS || '').split(',');
      
      if (!validKeys.includes(hashedKey)) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }
    }
    next();
  },
  
  // Input sanitization
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    if (req.query) {
      req.query = sanitizeObject(req.query as any) as any;
    }
    next();
  },
];

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
}