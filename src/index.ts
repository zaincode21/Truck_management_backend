import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import trucksRouter from './routes/trucks';
import employeesRouter from './routes/employees';
import productsRouter from './routes/products';
import deliveriesRouter from './routes/deliveries';
import expensesRouter from './routes/expenses';
import finesRouter from './routes/fines';
import dashboardRouter from './routes/dashboard';
import analyticsRouter from './routes/analytics';
import authRouter from './routes/auth';
import payrollRouter from './routes/payroll';
import usersRouter from './routes/users';
import settingsRouter from './routes/settings';
import { specs, swaggerUi } from './config/swagger';
import { requestLogger, errorLogger, RequestWithId } from './middleware/logger';
import { securityHeaders, helmetConfig } from './middleware/security';
import { rateLimiter } from './middleware/rateLimiter';
import { ResponseHelper } from './utils/response';
// Authentication removed - API is now public

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security Middleware (must be first)
app.use(helmetConfig);
app.use(securityHeaders);

// Request Logger (must be early to capture all requests)
app.use(requestLogger);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000', 
      'http://127.0.0.1:3000',
      'http://84.247.131.178:3000',
      'http://hardrocksupplies.com',
      'https://hardrocksupplies.com',
      'http://www.hardrocksupplies.com',
      'https://www.hardrocksupplies.com',
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Rate Limiting (apply to all routes except health check)
app.use('/api', rateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// JSON body parser with error handling
app.use(express.json({
  limit: '10mb',
  strict: true
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle JSON parsing errors
app.use((err: any, req: RequestWithId, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return ResponseHelper.badRequest(
      res,
      'Invalid JSON format in request body',
      undefined,
      { requestId: req.requestId }
    );
  }
  next(err);
});

// Swagger Documentation - Public (no authentication required)
// Anyone can view the API documentation, but they need auth to use the endpoints
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Truck Management API Documentation",
  swaggerOptions: {
    persistAuthorization: true, // Keep auth token in browser
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  }
}));

// Public Routes (no authentication required)
app.use('/api/auth', authRouter);
app.use('/api/trucks', trucksRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/products', productsRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/fines', finesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);

// Root route handler
app.get('/', (req: RequestWithId, res: express.Response) => {
  ResponseHelper.success(
    res,
    {
      version: '1.0.0',
      documentation: '/api-docs',
      health: '/health',
      endpoints: {
        auth: '/api/auth',
        trucks: '/api/trucks',
        employees: '/api/employees',
        products: '/api/products',
        deliveries: '/api/deliveries',
        expenses: '/api/expenses',
        fines: '/api/fines',
        payroll: '/api/payroll',
        users: '/api/users',
      }
    },
    'Truck Management API',
    200,
    { requestId: req.requestId }
  );
});

// Handle HEAD requests for health checks (used by Render and monitoring services)
app.head('/', (req: RequestWithId, res: express.Response) => {
  res.status(200).end();
});

// 404 handler for unknown routes
app.use((req: RequestWithId, res: express.Response) => {
  ResponseHelper.notFound(
    res,
    `Route ${req.method} ${req.path} not found`,
    { requestId: req.requestId }
  );
});

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Check API health status
 *     description: Returns the current status and timestamp of the API server
 *     responses:
 *       200:
 *         description: API is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/health', (req: RequestWithId, res) => {
  ResponseHelper.success(
    res,
    {
      status: 'ok',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
    'API is healthy',
    200,
    { requestId: req.requestId }
  );
});

// Error Logger Middleware
app.use(errorLogger);

// Global error handling middleware (must be last)
app.use((err: any, req: RequestWithId, res: express.Response, next: express.NextFunction) => {
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Prisma errors
  if (err.code === 'P2002') {
    return ResponseHelper.badRequest(
      res,
      'A record with this value already exists',
      undefined,
      { requestId: req.requestId }
    );
  }

  if (err.code === 'P2025') {
    return ResponseHelper.notFound(
      res,
      'Record not found',
      { requestId: req.requestId }
    );
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return ResponseHelper.validationError(
      res,
      'Validation failed',
      err.errors || {},
      { requestId: req.requestId }
    );
  }

  // JWT/Token errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return ResponseHelper.unauthorized(
      res,
      'Invalid or expired token',
      { requestId: req.requestId }
    );
  }

  // Default error response
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'An internal server error occurred';

  ResponseHelper.error(
    res,
    message,
    status,
    process.env.NODE_ENV === 'development' ? err.message : undefined,
    undefined,
    { requestId: req.requestId }
  );
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});
