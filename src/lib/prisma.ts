import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Ensure SSL is enabled for AlwaysData connections
const databaseUrl = process.env.DATABASE_URL || '';
const connectionUrl = databaseUrl.includes('alwaysdata.net') && !databaseUrl.includes('sslmode=')
  ? `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}sslmode=require`
  : databaseUrl;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
