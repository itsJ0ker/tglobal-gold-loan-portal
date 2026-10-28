import { Request, Response, NextFunction } from 'express';

const ADMIN_SECRET = process.env.ADMIN_API_KEY || 'admin_gold_secret_key_2026';

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const adminKey = req.headers['x-admin-key'];

  // Check Bearer token or x-admin-key header
  let token = adminKey;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Allow query param in dev mode if needed: ?adminKey=...
  if (!token && req.query.adminKey) {
    token = String(req.query.adminKey);
  }

  if (token === ADMIN_SECRET) {
    return next();
  }

  return res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Admin authentication required to access this resource.',
    },
  });
}
