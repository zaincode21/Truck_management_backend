#!/bin/bash

echo "=========================================="
echo "Database Connection Checker"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "Please create a .env file with your DATABASE_URL"
    exit 1
fi

# Load .env file
export $(cat .env | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not found in .env file!"
    echo ""
    echo "Please add DATABASE_URL to your .env file:"
    echo "DATABASE_URL=postgresql://username:password@host:port/database?schema=public"
    exit 1
fi

# Mask password for display
MASKED_URL=$(echo $DATABASE_URL | sed 's/:[^:@]*@/:****@/')
echo "📋 Database URL: $MASKED_URL"
echo ""

# Test connection using node
echo "⏳ Testing database connection..."
echo ""

node -e "
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || '';
const connectionUrl = databaseUrl.includes('alwaysdata.net') && !databaseUrl.includes('sslmode=')
  ? databaseUrl + (databaseUrl.includes('?') ? '&' : '?') + 'sslmode=require'
  : databaseUrl;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl,
    },
  },
  log: ['error'],
});

async function test() {
  try {
    await prisma.\$connect();
    console.log('✅ Database connection successful!');
    
    // Try a simple query
    const count = await prisma.employee.count();
    console.log(\`✅ Found \${count} employees in database\`);
    
    await prisma.\$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database connection is working!"
else
    echo ""
    echo "❌ Database connection failed!"
    echo ""
    echo "Common issues:"
    echo "1. Check if your database server is accessible from this VPS"
    echo "2. Verify the DATABASE_URL in .env is correct"
    echo "3. Check if firewall allows connections to database port (usually 5432)"
    echo "4. For remote databases, ensure SSL is enabled (add &sslmode=require)"
    exit 1
fi

