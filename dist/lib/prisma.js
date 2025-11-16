"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = global;
// Ensure SSL is enabled for AlwaysData connections
const databaseUrl = process.env.DATABASE_URL || '';
const connectionUrl = databaseUrl.includes('alwaysdata.net') && !databaseUrl.includes('sslmode=')
    ? `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}sslmode=require`
    : databaseUrl;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        datasources: {
            db: {
                url: connectionUrl,
            },
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
//# sourceMappingURL=prisma.js.map