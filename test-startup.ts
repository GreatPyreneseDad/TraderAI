import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function testStartup() {
  console.log('Testing TraderAI startup...\n');
  
  // Test database connection
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful');
  } catch (error) {
    console.log('❌ Database connection failed:', error);
    console.log('\nMake sure PostgreSQL is running and DATABASE_URL is configured correctly.');
    console.log('You can start PostgreSQL with: brew services start postgresql');
    return;
  }
  
  // Check if tables exist
  try {
    console.log('\nChecking database schema...');
    const userCount = await prisma.user.count();
    const marketDataCount = await prisma.marketData.count();
    console.log(`✅ Database schema is set up (${userCount} users, ${marketDataCount} market data points)`);
  } catch (error) {
    console.log('❌ Database schema not found. Run: npx prisma migrate dev');
    return;
  }
  
  // Test environment variables
  console.log('\nChecking environment variables...');
  const requiredEnvVars = [
    'CLAUDE_API_KEY',
    'TIINGO_API_TOKEN',
    'DATABASE_URL',
    'JWT_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName] === `your_${varName.toLowerCase()}_here`);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing or unconfigured environment variables:', missingVars);
    console.log('\nPlease update your .env file with actual values.');
  } else {
    console.log('✅ All required environment variables are set');
  }
  
  console.log('\n--- Startup Test Complete ---');
  
  await prisma.$disconnect();
}

testStartup().catch(console.error);