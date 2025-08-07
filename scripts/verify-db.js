#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('🔍 Verifying database connection...\n');

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!');

    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    if (tables.length > 0) {
      console.log(`\n📊 Found ${tables.length} tables:`);
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    } else {
      console.log('\n⚠️  No tables found. Run "npx prisma migrate dev" to create them.');
    }

    // Test write operation
    const health = await prisma.systemHealth.create({
      data: {
        service: 'database',
        status: 'HEALTHY',
        message: 'Database verification successful',
        metrics: {
          responseTime: 10,
          connectionsActive: 1
        }
      }
    });
    console.log('\n✅ Write test successful!');

    // Clean up test data
    await prisma.systemHealth.delete({
      where: { id: health.id }
    });

  } catch (error) {
    console.error('\n❌ Database verification failed:');
    console.error(error.message);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Make sure PostgreSQL is running');
    } else if (error.code === 'P1010') {
      console.log('\n💡 Run the setup.sql script in TablePlus first');
    } else if (error.code === 'P2021') {
      console.log('\n💡 Tables not found. Run: npx prisma migrate dev');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();