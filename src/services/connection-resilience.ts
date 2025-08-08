import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: Date | null = null;
  private successCount: number = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      resetTimeout: config.resetTimeout || 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod || 10000 // 10 seconds
    };
  }

  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      const now = new Date();
      if (this.lastFailureTime && 
          now.getTime() - this.lastFailureTime.getTime() > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        logger.info(`Circuit breaker for ${operationName} entering HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${operationName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess(operationName);
      return result;
    } catch (error) {
      this.onFailure(operationName, error);
      throw error;
    }
  }

  private onSuccess(operationName: string) {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successCount = 0;
        logger.info(`Circuit breaker for ${operationName} is now CLOSED`);
        this.emit('stateChange', { state: CircuitState.CLOSED, operation: operationName });
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  private onFailure(operationName: string, error: any) {
    this.failures++;
    this.lastFailureTime = new Date();
    
    logger.error(`Circuit breaker failure for ${operationName} (${this.failures}/${this.config.failureThreshold}):`, error);

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successCount = 0;
      logger.warn(`Circuit breaker for ${operationName} is now OPEN (failed in HALF_OPEN state)`);
      this.emit('stateChange', { state: CircuitState.OPEN, operation: operationName });
    } else if (this.state === CircuitState.CLOSED && this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.warn(`Circuit breaker for ${operationName} is now OPEN (threshold reached)`);
      this.emit('stateChange', { state: CircuitState.OPEN, operation: operationName });
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }
}

export class ConnectionPool<T> {
  private connections: T[] = [];
  private activeConnections: Set<T> = new Set();
  private readonly maxSize: number;
  private readonly createConnection: () => Promise<T>;
  private readonly validateConnection: (conn: T) => Promise<boolean>;
  private readonly destroyConnection: (conn: T) => Promise<void>;

  constructor(config: {
    maxSize: number;
    createConnection: () => Promise<T>;
    validateConnection: (conn: T) => Promise<boolean>;
    destroyConnection: (conn: T) => Promise<void>;
  }) {
    this.maxSize = config.maxSize;
    this.createConnection = config.createConnection;
    this.validateConnection = config.validateConnection;
    this.destroyConnection = config.destroyConnection;
  }

  async acquire(): Promise<T> {
    // Try to get an existing connection
    while (this.connections.length > 0) {
      const conn = this.connections.pop()!;
      
      try {
        const isValid = await this.validateConnection(conn);
        if (isValid) {
          this.activeConnections.add(conn);
          return conn;
        } else {
          await this.destroyConnection(conn);
        }
      } catch (error) {
        logger.error('Error validating connection:', error);
        try {
          await this.destroyConnection(conn);
        } catch (destroyError) {
          logger.error('Error destroying invalid connection:', destroyError);
        }
      }
    }

    // Create new connection if pool not at max size
    if (this.activeConnections.size < this.maxSize) {
      const conn = await this.createConnection();
      this.activeConnections.add(conn);
      return conn;
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.connections.length > 0) {
          clearInterval(checkInterval);
          this.acquire().then(resolve).catch(reject);
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Connection pool timeout'));
      }, 30000);
    });
  }

  async release(conn: T) {
    if (!this.activeConnections.has(conn)) {
      logger.warn('Attempting to release connection not in active set');
      return;
    }

    this.activeConnections.delete(conn);

    try {
      const isValid = await this.validateConnection(conn);
      if (isValid && this.connections.length < this.maxSize) {
        this.connections.push(conn);
      } else {
        await this.destroyConnection(conn);
      }
    } catch (error) {
      logger.error('Error releasing connection:', error);
      try {
        await this.destroyConnection(conn);
      } catch (destroyError) {
        logger.error('Error destroying connection on release:', destroyError);
      }
    }
  }

  async drain() {
    // Destroy all pooled connections
    const destroyPromises = this.connections.map(conn => 
      this.destroyConnection(conn).catch(error => 
        logger.error('Error destroying connection during drain:', error)
      )
    );

    await Promise.all(destroyPromises);
    this.connections = [];
  }

  getStats() {
    return {
      poolSize: this.connections.length,
      activeConnections: this.activeConnections.size,
      totalConnections: this.connections.length + this.activeConnections.size,
      maxSize: this.maxSize
    };
  }
}

export class ExponentialBackoff {
  private attempt: number = 0;
  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private readonly factor: number;
  private readonly jitter: boolean;

  constructor(config: {
    baseDelay?: number;
    maxDelay?: number;
    factor?: number;
    jitter?: boolean;
  } = {}) {
    this.baseDelay = config.baseDelay || 1000;
    this.maxDelay = config.maxDelay || 60000;
    this.factor = config.factor || 2;
    this.jitter = config.jitter !== false;
  }

  async execute<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 5,
    shouldRetry: (error: any) => boolean = () => true
  ): Promise<T> {
    this.attempt = 0;
    let lastError: any;

    while (this.attempt < maxAttempts) {
      try {
        const result = await operation();
        this.reset();
        return result;
      } catch (error) {
        lastError = error;
        this.attempt++;

        if (this.attempt >= maxAttempts || !shouldRetry(error)) {
          throw error;
        }

        const delay = this.getNextDelay();
        logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${this.attempt}/${maxAttempts})`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private getNextDelay(): number {
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(this.factor, this.attempt - 1),
      this.maxDelay
    );

    if (!this.jitter) {
      return exponentialDelay;
    }

    // Add jitter: ±25% of the delay
    const jitterRange = exponentialDelay * 0.25;
    const jitterValue = (Math.random() * 2 - 1) * jitterRange;
    return Math.round(exponentialDelay + jitterValue);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  reset() {
    this.attempt = 0;
  }
}