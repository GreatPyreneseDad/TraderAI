#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Initializing TraderAI Database...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found. Please copy .env.example to .env and configure it.');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL', 'REDIS_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

try {
  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Run database migrations
  console.log('\n🔄 Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  // Seed initial data (optional)
  console.log('\n🌱 Database initialized successfully!');
  console.log('\n✅ Next steps:');
  console.log('   1. Make sure PostgreSQL is running');
  console.log('   2. Make sure Redis is running');
  console.log('   3. Run "npm run dev" to start the application');

} catch (error) {
  console.error('\n❌ Database initialization failed:', error.message);
  process.exit(1);
}