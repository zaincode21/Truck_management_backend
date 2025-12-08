import { AuthUser } from '../middleware/auth';
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
export declare function generateAccessToken(user: AuthUser): string;
/**
 * Generate JWT refresh token
 */
export declare function generateRefreshToken(user: AuthUser): string;
/**
 * Verify JWT token
 */
export declare function verifyToken(token: string): TokenPayload;
/**
 * Decode token without verification (for debugging)
 */
export declare function decodeToken(token: string): TokenPayload | null;
//# sourceMappingURL=jwt.d.ts.map