#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanMockData() {
  console.log('🧹 Cleaning mock data from database...');

  try {
    // Delete all old market data (more than 1 hour old)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const deletedOld = await prisma.marketData.deleteMany({
      where: {
        timestamp: {
          lt: oneHourAgo
        }
      }
    });

    console.log(`✅ Deleted ${deletedOld.count} old market data records`);

    // Delete unrealistic mock prices
    // Real prices: AAPL ~$220, GOOGL ~$196, MSFT ~$520, etc.
    const deletedMock = await prisma.marketData.deleteMany({
      where: {
        OR: [
          { symbol: 'AAPL', price: { lt: 100 } },
          { symbol: 'GOOGL', price: { lt: 100 } },
          { symbol: 'MSFT', price: { lt: 200 } },
          { symbol: 'NVDA', price: { lt: 100 } },
          { symbol: 'BTC', price: { lt: 10000 } }
        ]
      }
    });

    console.log(`✅ Deleted ${deletedMock.count} mock data records with unrealistic prices`);

    // Get current data count
    const remaining = await prisma.marketData.count();
    console.log(`📊 ${remaining} market data records remaining`);

    // Show sample of current data
    const sample = await prisma.marketData.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' }
    });

    console.log('\n📈 Sample of current data:');
    sample.forEach(data => {
      console.log(`   ${data.symbol}: $${data.price} at ${data.timestamp.toISOString()}`);
    });

  } catch (error) {
    console.error('❌ Error cleaning data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanMockData();