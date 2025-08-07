# TraderAI
# TraderAI - Unified Market Intelligence System

## 🎯 Overview

TraderAI is a production-ready market intelligence platform that combines real-time market sentiment analysis, AI-powered inference generation, and human verification to deliver actionable trading insights. Built on the ECNE Data River architecture for maximum performance and reliability.

## 🏗️ Core Components

TraderAI integrates three powerful open-source systems:

### 1. ECNE Data River (Core Engine)
- **Repository**: https://github.com/ecne-org/data-river-core
- **Purpose**: Production-ready data processing engine
- **Features**: Circuit breakers, coherence filtering, real-time processing
- **Performance**: 200+ data points/second, <100ms latency

### 2. GCT Market Sentiment Engine
- **Repository**: https://github.com/gct-research/market-sentiment
- **Purpose**: Real-time financial market analysis using Grounded Coherence Theory
- **Features**: 4D coherence analysis (ψ, ρ, q, f), emotion detection, truth cost calculation
- **Data Sources**: Tiingo API, financial news, market data

### 3. Claude AI Integration
- **Purpose**: Human-AI collaborative inference generation
- **Features**: Three-angle analysis, debate system, human verification
- **AI Models**: Claude Sonnet 4 via Anthropic API

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED SYSTEM ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │   Web Frontend  │    │  Mobile App     │    │  API Gateway │ │
│  │   (React/TS)    │    │  (React Native) │    │  (Express)   │ │
│  └─────────┬───────┘    └─────────┬───────┘    └──────┬───────┘ │
│            │                      │                   │         │
│            └──────────────────────┼───────────────────┘         │
│                                   │                             │
├───────────────────────────────────┼─────────────────────────────┤
│                    ECNE DATA RIVER (CORE ENGINE)                │
├───────────────────────────────────┼─────────────────────────────┤
│                                   │                             │
│  ┌─────────────────┐    ┌─────────┴───────┐    ┌──────────────┐ │
│  │ Coherence Filter│    │  Circuit Breaker│    │ WebSocket    │ │
│  │ (4D GCT: ψρqf)  │    │  Protection     │    │ Live Updates │ │
│  └─────────┬───────┘    └─────────┬───────┘    └──────┬───────┘ │
│            │                      │                   │         │
│  ┌─────────┴───────┐    ┌─────────┴───────┐    ┌──────┴───────┐ │
│  │ Batch Processor │    │  Cache Manager  │    │ Rate Limiter │ │
│  │ (10k pts/min)   │    │  (LRU 10k items)│    │ (API protect)│ │
│  └─────────┬───────┘    └─────────┬───────┘    └──────┬───────┘ │
│            │                      │                   │         │
├───────────────────────────────────┼─────────────────────────────┤
│                   DATA SOURCES & PROCESSORS                     │
├───────────────────────────────────┼─────────────────────────────┤
│                                   │                             │
│  ┌─────────────────┐    ┌─────────┴───────┐    ┌──────────────┐ │
│  │ GCT Market      │    │ Verified        │    │ Debate Agent │ │
│  │ Sentiment       │    │ Inference       │    │ System       │ │
│  │ • Tiingo API    │    │ • Claude API    │    │ • Bull Agent │ │
│  │ • News Analysis │    │ • Human Verify  │    │ • Bear Agent │ │
│  │ • Coherence C   │    │ • 3 Angles      │    │ • Judge AI   │ │
│  └─────────┬───────┘    └─────────┬───────┘    └──────┬───────┘ │
│            │                      │                   │         │
├───────────────────────────────────┼─────────────────────────────┤
│                      STORAGE LAYER                              │
├───────────────────────────────────┼─────────────────────────────┤
│                                   │                             │
│  ┌─────────────────┐    ┌─────────┴───────┐    ┌──────────────┐ │
│  │ PostgreSQL      │    │ Redis Cache     │    │ File Storage │ │
│  │ • Market Data   │    │ • Session Data  │    │ • Logs       │ │
│  │ • Inference DB  │    │ • Rate Limits   │    │ • Exports    │ │
│  │ • User Accounts │    │ • WebSocket     │    │ • Backups    │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Key Features

### Real-time Market Intelligence
- **24/7 Market Monitoring**: Continuous data collection from Tiingo API
- **Coherence Analysis**: 4-dimensional GCT scoring (ψ, ρ, q, f)
- **Live Dashboard**: WebSocket-powered real-time updates
- **Smart Alerts**: Automated notifications for high-impact events

### AI-Powered Analysis
- **Debate Agent System**: Bull vs Bear argument analysis with neutral judge
- **Claude Integration**: Three-angle inference generation (Conservative, Progressive, Synthetic)
- **Human Verification**: Expert validation of AI-generated insights
- **Confidence Scoring**: Quantified reliability metrics

### High-Performance Infrastructure
- **ECNE Data River**: Production-ready core engine (200+ data points/second)
- **Circuit Breaker Protection**: Automatic failure recovery
- **Intelligent Caching**: 10k+ item LRU cache with 5-minute TTL
- **Rate Limiting**: API protection across all sources

## 📊 Performance Metrics

- **Throughput**: 200+ data points/second
- **Latency**: <100ms p95 response time
- **Uptime**: 99.9% availability target
- **Concurrency**: 1000+ simultaneous connections
- **Memory**: <2GB under full load

## 🛠️ Technology Stack

### Backend
- **Node.js** 18+ with TypeScript
- **Express.js** API framework
- **PostgreSQL** primary database
- **Redis** caching layer
- **WebSocket** real-time communication

### Frontend
- **React** 19 with TypeScript
- **TailwindCSS** styling
- **Chart.js** data visualization
- **Zustand** state management

### AI & Data
- **Claude API** (Anthropic) inference generation
- **Tiingo API** market data
- **Python** GCT analysis bridge
- **WebSocket** real-time price feeds

## 🔧 Quick Start

### Prerequisites
```bash
Node.js >= 18.0.0
PostgreSQL >= 14
Redis >= 6.0
Python >= 3.8
```

### Installation
```bash
# Clone main repository
git clone https://github.com/your-org/TraderAI.git
cd TraderAI

# Clone required submodules
git clone https://github.com/ecne-org/data-river-core.git ecne-core
git clone https://github.com/gct-research/market-sentiment.git gct-market

# Install dependencies
npm install

# Set up Python environment for GCT
cd gct-market
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Configure environment
cp .env.example .env
# Edit .env with your API keys and database credentials
```

### Environment Configuration
```bash
# Required API Keys
CLAUDE_API_KEY=your_claude_api_key_here
TIINGO_API_TOKEN=your_tiingo_token_here

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/trader_ai
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-ultra-secure-secret-minimum-64-chars
CORS_ORIGIN=http://localhost:3000

# Performance Settings
ECNE_MAX_CONCURRENT=50
ECNE_BATCH_SIZE=100
ECNE_CACHE_MAX_ITEMS=10000
```

### Database Setup
```bash
# Create database
createdb trader_ai

# Run migrations
npm run db:migrate

# Verify setup
npm run db:verify
```

### Start Development
```bash
# Start all services
npm run dev

# Or start individually
npm run dev:backend   # API server on port 3000
npm run dev:frontend  # React app on port 5173
npm run dev:dashboard # Dashboard on port 8080
```

## 📈 Usage

### Market Analysis
```typescript
// Get real-time market coherence
GET /api/market/coherence?symbols=AAPL,TSLA,NVDA

// Stream live updates
WebSocket: ws://localhost:8080/market-stream

// Get market alerts
GET /api/alerts?severity=CRITICAL&limit=20
```

### Inference Generation
```typescript
// Generate AI inferences
POST /api/inference/generate
{
  "query": "Should I buy NVDA before earnings?",
  "context": "Recent AI chip developments and market sentiment",
  "userId": "user-123"
}

// Verify inference
POST /api/inference/verify
{
  "inferenceId": "inf-456",
  "selectedOption": "debate_winner",
  "rationale": "Bull case more compelling given technical analysis"
}
```

### Debate System
```typescript
// Trigger market debate
POST /api/debate/analyze
{
  "symbol": "TSLA",
  "question": "Is Tesla a buy at current levels?"
}

// Response includes:
// - Bull agent arguments
// - Bear agent arguments  
// - Judge evaluation and verdict
// - Confidence scores for each position
```

## 🎭 Debate Agent System

### Bull Agent (Optimistic)
- Identifies growth opportunities
- Emphasizes positive catalysts
- Focuses on upside potential
- Builds persuasive buy cases

### Bear Agent (Pessimistic)  
- Highlights risks and challenges
- Emphasizes negative indicators
- Focuses on downside risks
- Builds persuasive sell cases

### Judge Agent (Neutral)
- Evaluates argument quality
- Weighs evidence objectively
- Detects bias and fallacies
- Delivers final verdict with confidence score

## 📊 Dashboard Features

### Market Overview
- Live coherence scores for major indices
- Top movers by coherence change
- Real-time sentiment distribution
- Active alert summary

### Individual Stock Analysis
- Historical coherence charts
- GCT component breakdown (ψ, ρ, q, f)
- Recent news impact analysis
- Debate history and outcomes

### System Health
- ECNE performance metrics
- API rate limit status
- Database connection health
- Error rate monitoring

## 🔐 Security Features

- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Per-source and per-user limits
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization
- **JWT Authentication**: Secure user sessions
- **CORS Configuration**: Controlled cross-origin access

## 📝 API Documentation

### Market Endpoints
```bash
GET    /api/market/coherence       # Get coherence scores
GET    /api/market/symbols/:symbol # Individual stock analysis
POST   /api/market/subscribe       # Subscribe to real-time updates
GET    /api/market/alerts          # Retrieve alerts
```

### Inference Endpoints
```bash
POST   /api/inference/generate     # Generate AI inferences
POST   /api/inference/verify       # Human verification
GET    /api/inference/history      # User inference history
POST   /api/inference/feedback     # Submit feedback
```

### Debate Endpoints
```bash
POST   /api/debate/analyze         # Start debate analysis
GET    /api/debate/results/:id     # Get debate results
POST   /api/debate/vote            # Cast human vote
GET    /api/debate/leaderboard     # Agent performance stats
```

### System Endpoints
```bash
GET    /api/health                 # System health check
GET    /api/metrics                # Performance metrics
GET    /api/status                 # Service status
POST   /api/admin/restart          # Admin operations
```

## 🧪 Testing

### Run Test Suite
```bash
# All tests
npm test

# Specific test types
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:performance   # Performance tests
npm run test:e2e          # End-to-end tests

# Coverage report
npm run test:coverage
```

### Performance Testing
```bash
# Load testing (1000+ connections)
npm run test:load

# Stress testing
npm run test:stress

# Memory leak detection
npm run test:memory
```

## 🚀 Deployment

### Production Build
```bash
# Build all components
npm run build

# Build specific components
npm run build:backend
npm run build:frontend
npm run build:dashboard
```

### Docker Deployment
```bash
# Build containers
docker-compose build

# Start production stack
docker-compose up -d

# Scale services
docker-compose up -d --scale backend=3
```

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://prod-user:password@db-host:5432/trader_ai
REDIS_URL=redis://redis-host:6379

# Performance tuning
ECNE_MAX_CONCURRENT=100
ECNE_BATCH_SIZE=200
WORKER_PROCESSES=4
```

## 📊 Monitoring

### Key Metrics
- **Coherence Processing Rate**: Target >100/second
- **Filter Accuracy**: Target >85% relevant signals
- **API Response Time**: Target <100ms p95
- **Error Rate**: Target <0.1%
- **Memory Usage**: Target <2GB per process

### Health Checks
```bash
# System health
curl http://localhost:3000/health

# Detailed status
curl http://localhost:3000/api/status/detailed

# Metrics endpoint
curl http://localhost:3000/api/metrics
```

### Log Management
```bash
# Application logs
tail -f logs/application.log

# Error logs
tail -f logs/error.log

# Performance logs
tail -f logs/performance.log
```

## 🤝 Contributing

### Development Setup
```bash
# Install development dependencies
npm install --include=dev

# Set up pre-commit hooks
npm run prepare

# Run linting
npm run lint

# Format code
npm run format
```

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Consistent formatting
- **Jest**: Testing framework
- **Husky**: Git hooks

### Pull Request Process
1. Fork repository
2. Create feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Update documentation
6. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Reference](docs/api.md)
- [Architecture Guide](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

### Community
- [GitHub Issues](https://github.com/your-org/TraderAI/issues)
- [Discussion Forum](https://github.com/your-org/TraderAI/discussions)
- [Discord Server](https://discord.gg/trader-ai)

### Commercial Support
For enterprise support and custom implementations:
- Email: support@trader-ai.com
- Schedule consultation: [calendly.com/trader-ai](https://calendly.com/trader-ai)

## 🙏 Acknowledgments

- **ECNE Team** ([data-river-core](https://github.com/ecne-org/data-river-core)) for the production-ready data processing engine
- **GCT Research** ([market-sentiment](https://github.com/gct-research/market-sentiment)) for the Grounded Coherence Theory implementation
- **Anthropic** for Claude API access
- **Tiingo** for comprehensive financial data feeds
- **Open Source Community** for the excellent supporting libraries

---

**Built with ❤️ for traders who demand excellence in market intelligence.**
