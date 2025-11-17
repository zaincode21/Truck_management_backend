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
const reports_1 = __importDefault(require("./routes/reports"));
const swagger_1 = require("./config/swagger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];
// 
// JSON body parser with error handling
app.use(express_1.default.json({
    limit: '10mb'
}));
// CORS configuration
app.use((0, cors_1.default)());
app.use(express_1.default.urlencoded({ extended: true }));
// Handle JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            error: 'Invalid JSON',
            message: 'The request body contains invalid JSON'
        });
    }
    next(err);
});
// Swagger Documentation
app.use('/api-docs', swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Truck Management API Documentation"
}));
// Routes
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
app.use('/api/reports', reports_1.default);
// 404 handler for unknown routes
app.use((req, res) => {
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
app.use((err, req, res, next) => {
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
//# sourceMappingURL=index.js.map