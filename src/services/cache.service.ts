import Redis from 'ioredis';
import { injectable } from 'inversify';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T>;
  invalidatePattern(pattern: string): Promise<void>;
  ping(): Promise<'PONG'>;
}

@injectable()
export class CacheService implements ICacheService {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    
    this.redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });
    
    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.setex(key, this.defaultTTL, serialized);
      }
    } catch (error) {
      logger.error('Cache set error:', { key, error });
    }
  }
  
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
    }
  }
  
  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const result = await callback();
    await this.set(key, result, ttl);
    return result;
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100,
    });
    
    stream.on('data', async (keys: string[]) => {
      if (keys.length) {
        await this.redis.del(...keys);
      }
    });
    
    stream.on('error', (err) => {
      logger.error('Cache invalidation error:', err);
    });
  }
  
  async ping(): Promise<'PONG'> {
    return this.redis.ping();
  }
  
  generateKey(...parts: string[]): string {
    return parts.join(':');
  }
  
  hashKey(data: any): string {
    const str = JSON.stringify(data);
    return createHash('sha256').update(str).digest('hex');
  }
}