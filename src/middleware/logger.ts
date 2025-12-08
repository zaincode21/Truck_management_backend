import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request Logger Middleware
 * Logs all incoming requests with timing information
 */
export interface RequestWithId extends Request {
  requestId?: string;
  startTime?: number;
}

export function requestLogger(req: RequestWithId, res: Response, next: NextFunction) {
  // Generate unique request ID
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request ID: ${req.requestId}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(
      `[${new Date().toISOString()}] ${logLevel} ${req.method} ${req.path} - ` +
      `Status: ${res.statusCode} - Duration: ${duration}ms - Request ID: ${req.requestId}`
    );
  });

  next();
}

/**
 * Error Logger
 */
export function errorLogger(err: any, req: RequestWithId, res: Response, next: NextFunction) {
  console.error(`[${new Date().toISOString()}] ERROR - Request ID: ${req.requestId || 'unknown'}`);
  console.error('Error Details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  next(err);
}


















