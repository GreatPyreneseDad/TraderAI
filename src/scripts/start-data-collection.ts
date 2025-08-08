#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Common stock symbols to track
const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ', 'BTC'];

interface TiingoPrice {
  date: string;
  close: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  adjClose: number;
  adjHigh: number;
  adjLow: number;
  adjOpen: number;
  adjVolume: number;
  divCash: number;
  splitFactor: number;
}

// Generate mock GCT coherence scores
function generateCoherenceScores() {
  return {
    psi: Math.random() * 0.3 + 0.5,  // 0.5-0.8
    rho: Math.random() * 0.3 + 0.4,  // 0.4-0.7
    q: Math.random() * 0.3 + 0.6,    // 0.6-0.9
    f: Math.random() * 0.2 + 0.3     // 0.3-0.5
  };
}

// Generate mock sentiment
function generateSentiment() {
  return Math.random() * 2 - 1; // -1 to 1
}

// Fetch real market data from Tiingo
async function fetchMarketData(symbol: string): Promise<TiingoPrice | null> {
  const token = process.env.TIINGO_API_TOKEN;
  
  if (!token || token === 'mock-tiingo-token') {
    // Return mock data if no real API key
    return {
      date: new Date().toISOString(),
      close: Math.random() * 500 + 100,
      high: Math.random() * 510 + 100,
      low: Math.random() * 490 + 100,
      open: Math.random() * 500 + 100,
      volume: Math.floor(Math.random() * 10000000),
      adjClose: Math.random() * 500 + 100,
      adjHigh: Math.random() * 510 + 100,
      adjLow: Math.random() * 490 + 100,
      adjOpen: Math.random() * 500 + 100,
      adjVolume: Math.floor(Math.random() * 10000000),
      divCash: 0,
      splitFactor: 1
    };
  }

  try {
    const response = await axios.get(
      `https://api.tiingo.com/tiingo/daily/${symbol}/prices`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        }
      }
    );

    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
  } catch (error) {
    logger.error(`Failed to fetch data for ${symbol}:`, error);
  }

  return null;
}

// Collect and store market data
async function collectMarketData() {
  logger.info('Starting market data collection...');

  for (const symbol of SYMBOLS) {
    try {
      const marketData = await fetchMarketData(symbol);
      
      if (!marketData) {
        logger.warn(`No data available for ${symbol}`);
        continue;
      }

      const coherenceScores = generateCoherenceScores();
      const sentiment = generateSentiment();

      // Store in database
      const record = await prisma.marketData.create({
        data: {
          symbol,
          timestamp: new Date(marketData.date),
          price: marketData.close,
          volume: BigInt(marketData.volume),
          coherenceScores,
          sentiment
        }
      });

      logger.info(`Stored data for ${symbol}: Price=${record.price}, Volume=${record.volume}`);

      // Check for coherence spikes and create alerts
      if (coherenceScores.psi > 0.75 || coherenceScores.rho > 0.65) {
        await prisma.alert.create({
          data: {
            type: 'COHERENCE_SPIKE',
            severity: coherenceScores.psi > 0.8 ? 'HIGH' : 'MEDIUM',
            symbol,
            title: `High coherence detected for ${symbol}`,
            message: `PSI=${coherenceScores.psi.toFixed(3)}, RHO=${coherenceScores.rho.toFixed(3)}`,
            data: coherenceScores
          }
        });
        logger.warn(`High coherence alert created for ${symbol}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      logger.error(`Error collecting data for ${symbol}:`, error);
    }
  }

  // Update system health
  await prisma.systemHealth.create({
    data: {
      service: 'ecne',
      status: 'HEALTHY',
      message: 'Data collection completed',
      metrics: {
        symbolsProcessed: SYMBOLS.length,
        timestamp: new Date()
      }
    }
  });
}

// Continuous collection loop
async function startContinuousCollection() {
  logger.info('Starting continuous data collection...');
  
  // Initial collection
  await collectMarketData();

  // Collect every 5 minutes
  setInterval(async () => {
    try {
      await collectMarketData();
    } catch (error) {
      logger.error('Error in continuous collection:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Create demo user if needed
async function ensureDemoUser() {
  const demoEmail = 'demo@traderai.com';
  
  const existingUser = await prisma.user.findUnique({
    where: { email: demoEmail }
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: demoEmail,
        username: 'demo',
        passwordHash: 'demo-hash', // In real app, use bcrypt
        role: 'USER'
      }
    });
    logger.info('Created demo user');
  }
}

// Main function
async function main() {
  try {
    logger.info('Initializing data collection service...');
    
    // Ensure demo user exists
    await ensureDemoUser();

    // Start continuous collection
    await startContinuousCollection();

    logger.info('Data collection service is running');
    logger.info('Check Prisma Studio at http://localhost:5555 to see data');
    logger.info('Press Ctrl+C to stop');

  } catch (error) {
    logger.error('Failed to start data collection:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down data collection...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the service
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});