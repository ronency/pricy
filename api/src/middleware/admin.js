import { authenticate } from './auth.js';

export async function authenticateAdmin(req, res, next) {
  // First authenticate normally
  authenticate(req, res, (err) => {
    if (err) return next(err);
    if (res.headersSent) return; // auth already sent 401

    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: { message: 'Admin access required', code: 'FORBIDDEN' }
      });
    }

    next();
  });
}
