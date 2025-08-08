import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public stack = ''
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  
  logger.error('Request failed', {
    correlationId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
    },
  });
  
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        correlationId,
      },
    });
    return;
  }
  
  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: {
          message: 'Duplicate entry',
          field: err.meta?.target,
          correlationId,
        },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        error: {
          message: 'Record not found',
          correlationId,
        },
      });
      return;
    }
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        message: 'Validation error',
        details: err.details,
        correlationId,
      },
    });
    return;
  }
  
  // Default error response
  res.status(500).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      correlationId,
    },
  });
};