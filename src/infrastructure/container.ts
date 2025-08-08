import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import winston from 'winston';

// Import services when they're refactored
// import { MarketService } from '../services/market.service';
// import { DatabaseService } from '../services/database.service';
// import { CacheService } from '../services/cache.service';

const container = new Container();

// Infrastructure bindings
container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(
  new PrismaClient({
    log: ['error', 'warn'],
  })
);

container.bind<Redis>(TYPES.Redis).toConstantValue(
  new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  })
);

container.bind<winston.Logger>(TYPES.Logger).toConstantValue(
  winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'trader-ai' },
    transports: [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
  })
);

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  const logger = container.get<winston.Logger>(TYPES.Logger);
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export { container };