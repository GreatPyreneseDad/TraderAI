# TraderAI System Overview

## 🏗️ Architecture

TraderAI is a production-ready market intelligence platform built with:

### Backend (Node.js + TypeScript)
- **Express.js** API server
- **PostgreSQL** for data persistence
- **Redis** for caching and real-time data
- **Socket.io** for WebSocket connections
- **Prisma ORM** for database management

### Frontend (React + TypeScript)
- **Vite** for fast development
- **React Query** for data fetching
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Chart.js** for data visualization

### AI Integration
- **ECNE Data River** - High-performance data processing
- **GCT Market Sentiment** - Coherence analysis
- **Claude AI** - Inference generation and debate system

## 🚀 Getting Started

### 1. Prerequisites
- PostgreSQL running locally
- Redis running locally
- Node.js 18+
- API Keys (Claude, Tiingo)

### 2. Setup
```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Set up database
./scripts/setup-local.sh

# Configure environment
# Edit .env with your API keys
```

### 3. Start Development
```bash
# Option 1: Simple start
./scripts/start-dev.sh

# Option 2: Manual start
redis-server
npm run dev
```

### 4. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/api/health

## 📁 Project Structure

```
TraderAI/
├── src/                    # Backend source code
│   ├── api/               # API route handlers
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── server.ts          # Main server file
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   ├── stores/        # Zustand stores
│   │   └── hooks/         # Custom hooks
│   └── index.html
├── ecne-core/             # ECNE Data River (submodule)
├── gct-market/            # GCT Market Sentiment (submodule)
├── prisma/                # Database schema
├── scripts/               # Utility scripts
└── database/              # SQL scripts

```

## 🔑 Key Features

### 1. Market Dashboard
- Real-time coherence scores (ψ, ρ, q, f)
- Top movers by coherence change
- Live price and volume updates
- WebSocket-powered updates

### 2. AI Inference Center
- Three-angle analysis (Conservative, Progressive, Synthetic)
- Automated debate system (Bull vs Bear with Judge)
- Human verification workflow
- Confidence scoring

### 3. Alert System
- Severity-based alerts (Critical, High, Medium, Low)
- Real-time notifications
- Alert acknowledgment
- Historical tracking

### 4. API Endpoints

#### Market Data
- `GET /api/market/coherence` - Get coherence scores
- `GET /api/market/symbols/:symbol` - Symbol details
- `GET /api/market/summary` - Market summary
- `POST /api/market/subscribe` - Subscribe to updates

#### Inference
- `POST /api/inference/generate` - Generate inference
- `POST /api/inference/verify` - Verify inference
- `GET /api/inference/history/:userId` - Get history

#### Debate
- `POST /api/debate/analyze` - Run debate
- `GET /api/debate/results/:id` - Get results
- `POST /api/debate/vote` - Cast vote

#### Alerts
- `GET /api/alerts` - Get alerts
- `PUT /api/alerts/:id/acknowledge` - Acknowledge

## 🔧 Configuration

### Environment Variables
- `CLAUDE_API_KEY` - Claude API key
- `TIINGO_API_TOKEN` - Tiingo API token
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - Authentication secret

### Performance Tuning
- `ECNE_MAX_CONCURRENT` - Max concurrent processing
- `ECNE_BATCH_SIZE` - Batch processing size
- `ECNE_CACHE_MAX_ITEMS` - Cache size limit

## 📊 Performance Targets
- **Throughput**: 200+ data points/second
- **Latency**: <100ms response time
- **Uptime**: 99.9% availability
- **Concurrency**: 1000+ connections

## 🛠️ Development Workflow

1. **Make Changes**: Edit code in `src/` or `frontend/src/`
2. **Hot Reload**: Changes auto-reload in development
3. **Test**: Run `npm test` (when implemented)
4. **Build**: Run `npm run build` for production
5. **Deploy**: Use Docker or PM2 for deployment

## 🐛 Troubleshooting

### Common Issues
1. **Database Connection Failed**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env

2. **Redis Connection Failed**
   - Start Redis: `redis-server`
   - Check REDIS_URL in .env

3. **Frontend Not Loading**
   - Install frontend deps: `cd frontend && npm install`
   - Check for port conflicts

4. **API Keys Invalid**
   - Verify Claude API key
   - Check Tiingo token

## 🚢 Production Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Set Production Environment**
   ```bash
   NODE_ENV=production
   ```

3. **Use Process Manager**
   ```bash
   pm2 start dist/server.js
   ```

4. **Enable SSL/TLS**
   - Use reverse proxy (Nginx)
   - Configure HTTPS

## 📈 Next Steps

1. **Add Authentication**: Implement user login/signup
2. **Enhance GCT**: Add more coherence dimensions
3. **Mobile App**: Create React Native version
4. **Historical Analysis**: Add backtesting
5. **ML Models**: Integrate predictive analytics

---

Built with ❤️ for traders who demand excellence in market intelligence.