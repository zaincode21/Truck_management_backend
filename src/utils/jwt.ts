import jwt from 'jsonwebtoken';
import { AuthUser } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production-min-32-chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  type: 'user' | 'employee' | 'admin';
  employee_id?: number;
  truck_id?: number | null;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: AuthUser): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email || '',
    role: user.role,
    type: user.role === 'admin' ? 'admin' : (user.employee_id ? 'employee' : 'user'),
    employee_id: user.employee_id,
    truck_id: user.truck_id
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string | number,
    issuer: 'truck-management-api',
    audience: 'truck-management-client'
  } as jwt.SignOptions);
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(user: AuthUser): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email || '',
    role: user.role,
    type: user.role === 'admin' ? 'admin' : (user.employee_id ? 'employee' : 'user'),
    employee_id: user.employee_id,
    truck_id: user.truck_id
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as string | number,
    issuer: 'truck-management-api',
    audience: 'truck-management-client'
  } as jwt.SignOptions);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'truck-management-api',
      audience: 'truck-management-client'
    }) as TokenPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}

