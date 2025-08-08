import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import marketDataRouter from './api/market-data';
import chatRouter from './api/chat';
import alertsRouter from './api/alerts';
import { initializeMarketStream } from './services/market-stream';

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api', marketDataRouter);
app.use('/api', chatRouter);
app.use('/api', alertsRouter);

// Routes
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'TraderAI API is running',
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        services: {
            api: 'running',
            database: 'connected',
            redis: 'pending'
        },
        timestamp: new Date().toISOString()
    });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
    
    // Handle subscriptions
    socket.on('subscribe', (symbols: string[]) => {
        console.log('📊 Client subscribed to:', symbols);
        // Join rooms for each symbol
        symbols.forEach(symbol => {
            socket.join(`market:${symbol}`);
        });
    });
    
    socket.on('unsubscribe', (symbols: string[]) => {
        console.log('📊 Client unsubscribed from:', symbols);
        symbols.forEach(symbol => {
            socket.leave(`market:${symbol}`);
        });
    });
});

// Start server with WebSocket support
httpServer.listen(PORT, async () => {
    console.log(`✅ TraderAI minimal server running on port ${PORT}`);
    console.log(`📊 Test API at http://localhost:${PORT}/api/test`);
    console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
    console.log(`🔌 WebSocket server ready`);
    
    // Initialize real market data stream
    await initializeMarketStream(io);
});
