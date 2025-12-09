import { authenticateUser } from './auth.js';
/**
 * Swagger UI Authentication Middleware
 * Protects Swagger documentation with authentication
 */
export function swaggerAuth(req, res, next) {
    // Check if this is a request for Swagger UI assets (CSS, JS, etc.)
    if (req.path.includes('/swagger-ui') || req.path.includes('/api-docs')) {
        // For Swagger UI assets, we need to handle authentication differently
        // We'll check authentication for the main page, but allow assets
        if (req.path === '/api-docs' || req.path === '/api-docs/') {
            // This is the main Swagger UI page - require authentication
            return authenticateUser(req, res, next);
        }
    }
    // For other Swagger-related paths, check authentication
    return authenticateUser(req, res, next);
}
//# sourceMappingURL=swaggerAuth.js.map