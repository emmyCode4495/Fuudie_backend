import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AuthMiddleware {
  /**
   * Reads user identity from api-gateway injected headers first,
   * then falls back to decoding the Bearer token directly.
   * Never blocks — public routes still work if no identity is found.
   */
  static extractUser(req: AuthRequest, _res: Response, next: NextFunction): void {
    try {
      const userId    = req.headers['x-user-id']    as string;
      const userEmail = req.headers['x-user-email'] as string;
      const userRole  = req.headers['x-user-role']  as string;

      if (userId && userEmail && userRole) {
        req.user = { id: userId, email: userEmail, role: userRole };
        return next();
      }

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token   = authHeader.substring(7);
        const decoded = jwt.decode(token) as any;
        if (decoded?.id) {
          req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        }
      }

      next();
    } catch {
      next();
    }
  }

  static requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    next();
  }

  static requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }
    next();
  }

  static requireOwnerOrAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (req.user.role !== 'admin' && req.user.role !== 'store_owner') {
      res.status(403).json({ success: false, message: 'Store owner or admin access required' });
      return;
    }
    next();
  }
}
