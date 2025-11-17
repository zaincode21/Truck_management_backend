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
import reportsRouter from './routes/reports';
import { specs, swaggerUi } from './config/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// 

// JSON body parser with error handling
app.use(express.json({
  limit: '10mb'
}));

// CORS configuration
app.use(cors());

app.use(express.urlencoded({ extended: true }));

// Handle JSON parsing errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ 
      error: 'Invalid JSON', 
      message: 'The request body contains invalid JSON' 
    });
  }
  next(err);
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Truck Management API Documentation"
}));

// Routes
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
app.use('/api/reports', reportsRouter);

// 404 handler for unknown routes
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handling middleware (must be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  console.error('Global error handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ 
    error: err.message || 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});
