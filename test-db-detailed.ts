import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

async function testDatabaseConnection() {
  console.log('🔍 Detailed Database Connection Test\n');
  console.log('=' .repeat(60));

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  
  // Parse the URL to show details (without password)
  try {
    const url = new URL(dbUrl);
    console.log('📋 Connection Details:');
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Username: ${url.username}`);
    console.log(`   Password: ${url.password ? '****' : '(not set)'}`);
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port || '5432 (default)'}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    console.log(`   Search params: ${url.search}`);
    console.log('');
  } catch (e) {
    console.log('⚠️  Could not parse DATABASE_URL as URL');
    console.log(`   Raw value: ${dbUrl.substring(0, 50)}...`);
    console.log('');
  }

  // Check for SSL requirement
  const needsSSL = dbUrl.includes('sslmode=require') || dbUrl.includes('alwaysdata.net');
  console.log(`🔒 SSL Required: ${needsSSL ? 'Yes' : 'No'}`);
  
  // Ensure SSL is enabled if needed
  let connectionUrl = dbUrl;
  if (needsSSL && !connectionUrl.includes('sslmode=')) {
    connectionUrl += (connectionUrl.includes('?') ? '&' : '?') + 'sslmode=require';
    console.log('   ✅ Added sslmode=require to connection string');
  }
  console.log('');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
    log: ['error', 'warn', 'info'],
  });

  try {
    console.log('⏳ Attempting connection...');
    console.log('');
    
    // Test connection with timeout
    const connectPromise = prisma.$connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Database connection established!\n');

    // Test a simple query
    console.log('⏳ Testing database query...');
    const versionResult = await prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version() as version
    `;
    console.log(`✅ PostgreSQL Version: ${versionResult[0]?.version?.substring(0, 50)}...\n`);

    // Get database info
    const dbInfo = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database()
    `;
    const dbName = dbInfo[0]?.current_database || 'unknown';
    console.log(`📊 Connected to database: ${dbName}\n`);

    // Test Prisma models
    console.log('⏳ Testing Prisma models...');
    try {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `;
      console.log(`✅ Found ${tables.length} tables in database:`);
      tables.slice(0, 10).forEach(t => console.log(`   - ${t.tablename}`));
      if (tables.length > 10) {
        console.log(`   ... and ${tables.length - 10} more`);
      }
      console.log('');
    } catch (e: any) {
      console.log(`⚠️  Could not list tables: ${e.message}`);
    }

    // Test specific models
    const models = ['User', 'Truck', 'Employee', 'Delivery', 'Product'];
    for (const model of models) {
      try {
        const count = await (prisma as any)[model.toLowerCase()].count();
        console.log(`   ✅ ${model} table: ${count} records`);
      } catch (e) {
        // Model might not exist or have different name
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('🎉 Your database is working correctly.\n');

  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ DATABASE CONNECTION FAILED!\n');
    console.error('Error Details:');
    console.error(`   Message: ${error.message}`);
    
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }

    // Provide helpful error messages
    console.error('\n💡 Troubleshooting Tips:');
    
    if (error.message?.includes('P1001') || error.message?.includes("Can't reach")) {
      console.error('   1. Check if the database server is running');
      console.error('   2. Verify the hostname is correct');
      console.error('   3. Check your network connection');
      console.error('   4. Verify firewall rules allow connections');
    } else if (error.message?.includes('P1000') || error.message?.includes('authentication')) {
      console.error('   1. Verify username and password are correct');
      console.error('   2. Check if password needs URL encoding');
      console.error('   3. Ensure the user has proper permissions');
    } else if (error.message?.includes('P1003') || error.message?.includes('does not exist')) {
      console.error('   1. Verify the database name is correct');
      console.error('   2. Check if the database exists on the server');
    } else if (error.message?.includes('SSL') || error.message?.includes('certificate')) {
      console.error('   1. SSL connection might be required');
      console.error('   2. Try adding ?sslmode=require to DATABASE_URL');
      console.error('   3. Check if SSL certificates are valid');
    } else if (error.message?.includes('timeout')) {
      console.error('   1. Connection timed out - server might be slow');
      console.error('   2. Check network latency');
      console.error('   3. Verify the server is accessible');
    }

    console.error('');
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




