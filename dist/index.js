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
const swagger_1 = require("./config/swagger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];
// 
app.use(express_1.default.json());
//cors configuration
app.use((0, cors_1.default)());
app.use(express_1.default.urlencoded({ extended: true }));
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
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});
//# sourceMappingURL=index.js.map