#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ', 'BTC'];

async function seedDemoData() {
  console.log('🌱 Seeding demo data...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@traderai.com' },
    update: {},
    create: {
      email: 'demo@traderai.com',
      username: 'demo',
      passwordHash: '$2b$10$demo-hash-not-real', // Not a real hash
      role: 'USER'
    }
  });
  console.log('✅ Demo user created');

  // Generate market data for the last 7 days
  const now = new Date();
  const dataPoints = [];

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - dayOffset);
    timestamp.setHours(9, 30, 0, 0); // Market open

    for (const symbol of SYMBOLS) {
      // Generate 8 data points per day (hourly during market hours)
      for (let hour = 0; hour < 8; hour++) {
        const dataTime = new Date(timestamp);
        dataTime.setHours(timestamp.getHours() + hour);

        const basePrice = symbol === 'BTC' ? 45000 : 
                         symbol === 'GOOGL' ? 150 :
                         symbol === 'AAPL' ? 180 :
                         symbol === 'MSFT' ? 380 :
                         symbol === 'AMZN' ? 170 :
                         symbol === 'TSLA' ? 250 :
                         symbol === 'META' ? 350 :
                         symbol === 'NVDA' ? 500 :
                         symbol === 'SPY' ? 450 : 380;

        const volatility = symbol === 'BTC' ? 0.05 : 
                          symbol === 'TSLA' ? 0.03 : 0.02;

        const price = basePrice * (1 + (Math.random() - 0.5) * volatility);
        const volume = BigInt(Math.floor(Math.random() * 10000000 + 1000000));

        const coherenceScores = {
          psi: 0.5 + Math.random() * 0.3,
          rho: 0.4 + Math.random() * 0.3,
          q: 0.6 + Math.random() * 0.3,
          f: 0.3 + Math.random() * 0.2
        };

        dataPoints.push({
          symbol,
          timestamp: dataTime,
          price: Math.round(price * 100) / 100,
          volume,
          coherenceScores,
          sentiment: Math.random() * 2 - 1
        });
      }
    }
  }

  // Bulk insert market data
  console.log(`📊 Inserting ${dataPoints.length} market data points...`);
  await prisma.marketData.createMany({
    data: dataPoints
  });
  console.log('✅ Market data created');

  // Create some demo inferences
  const inferences = [];
  const queries = [
    "What's the outlook for AAPL?",
    "Should I invest in TSLA?",
    "Market analysis for tech stocks",
    "Is BTC a good investment now?",
    "Compare GOOGL vs MSFT performance"
  ];

  for (const query of queries) {
    inferences.push({
      userId: demoUser.id,
      query,
      context: JSON.stringify({ market: 'volatile', trend: 'bullish' }),
      conservative: {
        answer: `Conservative analysis for: ${query}`,
        confidence: 0.7,
        reasoning: "Based on historical patterns and risk management"
      },
      progressive: {
        answer: `Progressive analysis for: ${query}`,
        confidence: 0.8,
        reasoning: "Considering growth potential and market momentum"
      },
      synthetic: {
        answer: `Balanced synthesis for: ${query}`,
        confidence: 0.85,
        reasoning: "Combining both conservative and progressive viewpoints"
      },
      status: 'COMPLETED',
      confidence: 0.8,
      metadata: {
        enhanced: true,
        symbols: SYMBOLS.slice(0, 3)
      }
    });
  }

  await prisma.inference.createMany({
    data: inferences
  });
  console.log('✅ Demo inferences created');

  // Create some alerts
  const alerts = [
    {
      type: 'COHERENCE_SPIKE' as const,
      severity: 'HIGH' as const,
      symbol: 'TSLA',
      title: 'High coherence detected for TSLA',
      message: 'PSI=0.82, RHO=0.78 - Potential market movement',
      data: { psi: 0.82, rho: 0.78, q: 0.75, f: 0.45 }
    },
    {
      type: 'MARKET_ANOMALY' as const,
      severity: 'MEDIUM' as const,
      symbol: 'BTC',
      title: 'Unusual volume pattern detected',
      message: 'Volume spike 3x normal average',
      data: { volumeRatio: 3.2, avgVolume: 1000000 }
    }
  ];

  await prisma.alert.createMany({
    data: alerts
  });
  console.log('✅ Demo alerts created');

  // Update system health
  await prisma.systemHealth.create({
    data: {
      service: 'database',
      status: 'HEALTHY',
      message: 'Demo data seeded successfully',
      metrics: {
        marketDataPoints: dataPoints.length,
        inferences: inferences.length,
        alerts: alerts.length
      }
    }
  });

  console.log('\n🎉 Demo data seeding complete!');
  console.log('📊 Summary:');
  console.log(`   - Market data points: ${dataPoints.length}`);
  console.log(`   - Inferences: ${inferences.length}`);
  console.log(`   - Alerts: ${alerts.length}`);
  console.log('\n💡 Open Prisma Studio to view the data:');
  console.log('   npx prisma studio');
}

// Main execution
seedDemoData()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });