import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.log('\n💡 Make sure your .env file contains:');
    console.log('   DATABASE_URL=postgresql://username:password@host:port/database?schema=public');
    process.exit(1);
  }

  // Mask the password in the URL for display
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`📋 Database URL: ${maskedUrl}\n`);

  // Ensure SSL is enabled if required
  let connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl.includes('sslmode=')) {
    connectionUrl += (connectionUrl.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
    log: ['error', 'warn'],
  });

  try {
    console.log('⏳ Connecting to database...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');

    // Test a simple query
    console.log('⏳ Testing database query...');
    const result = await prisma.$queryRaw`SELECT version() as version`;
    console.log('✅ Database query successful!\n');

    // Get database info
    const dbInfo = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database()
    `;
    const dbName = dbInfo[0]?.current_database || 'unknown';
    console.log(`📊 Connected to database: ${dbName}`);

    // Test Prisma models (if any tables exist)
    try {
      const userCount = await prisma.user.count().catch(() => null);
      if (userCount !== null) {
        console.log(`👥 Users table exists (${userCount} records)`);
      }
    } catch (e) {
      // Table might not exist, that's okay
    }

    console.log('\n✅ All database tests passed!');
    console.log('🎉 Your database is working correctly.\n');

  } catch (error: any) {
    console.error('\n❌ Database connection failed!\n');
    console.error('Error details:');
    console.error(`   Message: ${error.message}`);
    
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }

    // Provide helpful error messages
    if (error.message?.includes('P1001')) {
      console.error('\n💡 This usually means:');
      console.error('   - Database server is not reachable');
      console.error('   - Wrong host or port in DATABASE_URL');
      console.error('   - Firewall blocking the connection');
    } else if (error.message?.includes('P1000')) {
      console.error('\n💡 This usually means:');
      console.error('   - Authentication failed');
      console.error('   - Wrong username or password in DATABASE_URL');
    } else if (error.message?.includes('P1003')) {
      console.error('\n💡 This usually means:');
      console.error('   - Database does not exist');
      console.error('   - Wrong database name in DATABASE_URL');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the test
testDatabaseConnection()
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });



