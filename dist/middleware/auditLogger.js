"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = auditLogger;
exports.getAuditLogs = getAuditLogs;
const auditLogs = [];
const MAX_AUDIT_LOGS = 10000; // Keep last 10k logs in memory
/**
 * Security audit logger middleware
 */
function auditLogger(req, res, next) {
    const originalSend = res.send;
    res.send = function (body) {
        // Log security-sensitive actions
        const sensitivePaths = ['/api/auth/login', '/api/auth/logout', '/api/users', '/api/auth/change-password'];
        const isSensitive = sensitivePaths.some(path => req.path.includes(path));
        if (isSensitive || res.statusCode >= 400) {
            const log = {
                timestamp: new Date(),
                userId: req.user?.id,
                ip: req.ip || req.socket.remoteAddress || 'unknown',
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                action: getActionFromPath(req.path, req.method),
                details: res.statusCode >= 400 ? { error: typeof body === 'string' ? body.substring(0, 200) : body } : undefined
            };
            auditLogs.push(log);
            // Keep only last MAX_AUDIT_LOGS entries
            if (auditLogs.length > MAX_AUDIT_LOGS) {
                auditLogs.shift();
            }
            console.log('[AUDIT]', JSON.stringify(log));
            // In production, send to external logging service
            if (process.env.NODE_ENV === 'production' && process.env.AUDIT_LOG_WEBHOOK) {
                // Send to external service (e.g., Loggly, Datadog)
                fetch(process.env.AUDIT_LOG_WEBHOOK, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(log)
                }).catch(err => console.error('Failed to send audit log:', err));
            }
        }
        return originalSend.call(this, body);
    };
    next();
}
function getActionFromPath(path, method) {
    if (path.includes('/login'))
        return 'LOGIN_ATTEMPT';
    if (path.includes('/logout'))
        return 'LOGOUT';
    if (path.includes('/change-password'))
        return 'PASSWORD_CHANGE';
    if (path.includes('/users') && method === 'POST')
        return 'USER_CREATE';
    if (path.includes('/users') && method === 'PUT')
        return 'USER_UPDATE';
    if (path.includes('/users') && method === 'DELETE')
        return 'USER_DELETE';
    return `${method}_${path}`;
}
/**
 * Get audit logs (admin only)
 */
function getAuditLogs(limit = 100) {
    return auditLogs.slice(-limit).reverse();
}
//# sourceMappingURL=auditLogger.js.map