"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const trucks_1 = __importDefault(require("./routes/trucks"));
const employees_1 = __importDefault(require("./routes/employees"));
const products_1 = __importDefault(require("./routes/products"));
const deliveries_1 = __importDefault(require("./routes/deliveries"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const fines_1 = __importDefault(require("./routes/fines"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const auth_1 = __importDefault(require("./routes/auth"));
const payroll_1 = __importDefault(require("./routes/payroll"));
const users_1 = __importDefault(require("./routes/users"));
const settings_1 = __importDefault(require("./routes/settings"));
const swagger_1 = require("./config/swagger");
const logger_1 = require("./middleware/logger");
const security_1 = require("./middleware/security");
const rateLimiter_1 = require("./middleware/rateLimiter");
const response_1 = require("./utils/response");
// Authentication removed - API is now public
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);
// Security Middleware (must be first)
app.use(security_1.helmetConfig);
app.use(security_1.securityHeaders);
// Request Logger (must be early to capture all requests)
app.use(logger_1.requestLogger);
// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://84.247.131.178:3000',
        // 'https://truck-management-frontend.onrender.com'
    ];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));
// Rate Limiting (apply to all routes except health check)
app.use('/api', (0, rateLimiter_1.rateLimiter)(15 * 60 * 1000, 100)); // 100 requests per 15 minutes
// JSON body parser with error handling
app.use(express_1.default.json({
    limit: '10mb',
    strict: true
}));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Handle JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
        return response_1.ResponseHelper.badRequest(res, 'Invalid JSON format in request body', undefined, { requestId: req.requestId });
    }
    next(err);
});
// Swagger Documentation - Public (no authentication required)
// Anyone can view the API documentation, but they need auth to use the endpoints
app.use('/api-docs', swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.specs, {
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
app.use('/api/auth', auth_1.default);
app.use('/api/trucks', trucks_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/products', products_1.default);
app.use('/api/deliveries', deliveries_1.default);
app.use('/api/expenses', expenses_1.default);
app.use('/api/fines', fines_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/payroll', payroll_1.default);
app.use('/api/users', users_1.default);
app.use('/api/settings', settings_1.default);
// Root route handler
app.get('/', (req, res) => {
    response_1.ResponseHelper.success(res, {
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
    }, 'Truck Management API', 200, { requestId: req.requestId });
});
// Handle HEAD requests for health checks (used by Render and monitoring services)
app.head('/', (req, res) => {
    res.status(200).end();
});
// 404 handler for unknown routes
app.use((req, res) => {
    response_1.ResponseHelper.notFound(res, `Route ${req.method} ${req.path} not found`, { requestId: req.requestId });
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
    response_1.ResponseHelper.success(res, {
        status: 'ok',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    }, 'API is healthy', 200, { requestId: req.requestId });
});
// Error Logger Middleware
app.use(logger_1.errorLogger);
// Global error handling middleware (must be last)
app.use((err, req, res, next) => {
    // Don't send response if headers already sent
    if (res.headersSent) {
        return next(err);
    }
    // Prisma errors
    if (err.code === 'P2002') {
        return response_1.ResponseHelper.badRequest(res, 'A record with this value already exists', undefined, { requestId: req.requestId });
    }
    if (err.code === 'P2025') {
        return response_1.ResponseHelper.notFound(res, 'Record not found', { requestId: req.requestId });
    }
    // Validation errors
    if (err.name === 'ValidationError') {
        return response_1.ResponseHelper.validationError(res, 'Validation failed', err.errors || {}, { requestId: req.requestId });
    }
    // JWT/Token errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return response_1.ResponseHelper.unauthorized(res, 'Invalid or expired token', { requestId: req.requestId });
    }
    // Default error response
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'development'
        ? err.message
        : 'An internal server error occurred';
    response_1.ResponseHelper.error(res, message, status, process.env.NODE_ENV === 'development' ? err.message : undefined, undefined, { requestId: req.requestId });
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});
//# sourceMappingURL=index.js.map