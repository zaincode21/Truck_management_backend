import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyToken, TokenPayload } from '../utils/jwt';

export interface AuthUser {
  id: string;
  email?: string;
  role: string;
  employee_id?: number;
  truck_id?: number | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Enhanced authentication middleware with JWT
 * Supports both JWT tokens (new) and base64 tokens (legacy compatibility)
 */
export async function authenticateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Please provide a valid token.'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      // Try JWT token first (new system)
      try {
        const decoded = verifyToken(token);
        
        // Check token type and fetch user accordingly
        if (decoded.type === 'admin') {
          req.user = {
            id: decoded.id,
            email: decoded.email,
            role: 'admin'
          };
          return next();
        } else if (decoded.type === 'user') {
          const userId = parseInt(decoded.id);
          const user = await prisma.user.findUnique({
            where: { id: userId }
          });

          if (!user || user.status !== 'active') {
            return res.status(401).json({
              success: false,
              error: 'User not found or inactive'
            });
          }

          req.user = {
            id: user.id.toString(),
            email: user.email,
            role: user.role
          };
          return next();
        } else if (decoded.type === 'employee') {
          const employeeId = decoded.employee_id || parseInt(decoded.id);
          const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: { truck: true }
          });

          if (!employee || employee.status !== 'active') {
            return res.status(401).json({
              success: false,
              error: 'Employee not found or inactive'
            });
          }

          req.user = {
            id: employee.id.toString(),
            email: employee.email,
            role: employee.role || 'driver',
            employee_id: employee.id,
            truck_id: employee.truck_id
          };
          return next();
        } else {
          return res.status(401).json({
            success: false,
            error: 'Invalid token type'
          });
        }
      } catch (jwtError: any) {
        // If JWT verification fails, try legacy base64 token (backward compatibility)
        if (jwtError.message === 'Token expired' || jwtError.message === 'Invalid token') {
          // Try legacy base64 token format
          try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const parts = decoded.split(':');
            
            if (parts[0] === 'admin') {
              req.user = {
                id: 'admin',
                email: parts[1],
                role: 'admin'
              };
              return next();
            } else if (parts[0] === 'user') {
              const userId = parseInt(parts[1]);
              const user = await prisma.user.findUnique({
                where: { id: userId }
              });

              if (!user || user.status !== 'active') {
                return res.status(401).json({
                  success: false,
                  error: 'User not found or inactive'
                });
              }

              req.user = {
                id: user.id.toString(),
                email: user.email,
                role: user.role
              };
              return next();
            } else if (parts[0] === 'employee') {
              const employeeId = parseInt(parts[1]);
              const employee = await prisma.employee.findUnique({
                where: { id: employeeId },
                include: { truck: true }
              });

              if (!employee || employee.status !== 'active') {
                return res.status(401).json({
                  success: false,
                  error: 'Employee not found or inactive'
                });
              }

              req.user = {
                id: employee.id.toString(),
                email: employee.email,
                role: employee.role || 'driver',
                employee_id: employee.id,
                truck_id: employee.truck_id
              };
              return next();
            }
          } catch (legacyError) {
            // Both JWT and legacy failed
            if (jwtError.message === 'Token expired') {
              return res.status(401).json({
                success: false,
                error: 'Token expired. Please login again.'
              });
            }
            return res.status(401).json({
              success: false,
              error: 'Invalid or malformed token'
            });
          }
        }
        throw jwtError;
      }
    } catch (error: any) {
      if (error.message === 'Token expired') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid or malformed token'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during authentication'
    });
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}


