import jwt from 'jsonwebtoken';
import { UserModel } from '../config/userSchema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' }
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await UserModel.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          error: { message: 'User not found', code: 'UNAUTHORIZED' }
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          error: { message: 'Account is deactivated', code: 'FORBIDDEN' }
        });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        error: { message: 'Invalid token', code: 'UNAUTHORIZED' }
      });
    }
  } catch (error) {
    next(error);
  }
}

export async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: { message: 'API key required', code: 'UNAUTHORIZED' }
      });
    }

    const user = await UserModel.findOne({ apiKey, isActive: true });

    if (!user) {
      return res.status(401).json({
        error: { message: 'Invalid API key', code: 'UNAUTHORIZED' }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function authenticateFlexible(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
      return authenticateApiKey(req, res, next);
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authenticate(req, res, next);
    }

    return res.status(401).json({
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' }
    });
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
      const user = await UserModel.findOne({ apiKey, isActive: true });
      if (user) req.user = user;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await UserModel.findById(decoded.userId);
        if (user && user.isActive) req.user = user;
      } catch {
        // Token invalid, continue without user
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
