import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  employee_id?: number;
  truck_id?: number | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware to extract and verify user from token
 */
export async function authenticateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      
      if (parts[0] === 'admin') {
        // Admin user
        req.user = {
          id: 'admin',
          email: parts[1],
          role: 'admin'
        };
        return next();
      } else if (parts[0] === 'employee') {
        // Employee/Driver user
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

        // Use role from database, default to 'driver' if not set
        const userRole = employee.role || 'driver';

        req.user = {
          id: employee.id.toString(),
          email: employee.email,
          role: userRole,
          employee_id: employee.id,
          truck_id: employee.truck_id
        };
        return next();
      } else {
        return res.status(401).json({
          success: false,
          error: 'Invalid token format'
        });
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
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


