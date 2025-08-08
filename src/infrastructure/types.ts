export const TYPES = {
  // Services
  MarketService: Symbol.for('MarketService'),
  DatabaseService: Symbol.for('DatabaseService'),
  CacheService: Symbol.for('CacheService'),
  AuthService: Symbol.for('AuthService'),
  ECNEService: Symbol.for('ECNEService'),
  GCTService: Symbol.for('GCTService'),
  ClaudeService: Symbol.for('ClaudeService'),
  WebSocketManager: Symbol.for('WebSocketManager'),
  QueueService: Symbol.for('QueueService'),
  
  // Repositories
  MarketRepository: Symbol.for('MarketRepository'),
  UserRepository: Symbol.for('UserRepository'),
  InferenceRepository: Symbol.for('InferenceRepository'),
  
  // Infrastructure
  EventBus: Symbol.for('EventBus'),
  Logger: Symbol.for('Logger'),
  Redis: Symbol.for('Redis'),
  PrismaClient: Symbol.for('PrismaClient'),
};