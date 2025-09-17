import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { ROLE_PERMISSIONS } from '../shared/permissions';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        fullName: string;
        role: string;
        email?: string;
        branchId?: string;
      };
    }
  }
}

// Fail fast if JWT secret not provided - critical for production security
const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  console.error('🔴 CRITICAL: SESSION_SECRET environment variable not set. Application cannot start.');
  process.exit(1);
}

const JWT_EXPIRES_IN = '15m'; // Shortened for healthcare security
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  branchId?: string;
}

export const generateTokens = (user: { id: string; username: string; role: string; branchId?: string }) => {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    branchId: user.branchId
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }

  // Get fresh user data
  try {
    const user = await storage.getUser(payload.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Пользователь не найден или неактивен' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      email: user.email || undefined,
      branchId: payload.branchId
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Ошибка аутентификации' });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Аутентификация требуется' });
    }

    // Руководитель имеет доступ ко всему
    if (req.user.role === 'руководитель') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Недостаточно прав доступа',
        required: allowedRoles,
        current: req.user.role 
      });
    }

    next();
  };
};

export const requireModuleAccess = (module: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Аутентификация требуется' });
    }

    // Руководитель имеет доступ ко всему
    if (req.user.role === 'руководитель') {
      return next();
    }

    const userRole = req.user.role as keyof typeof ROLE_PERMISSIONS;
    const allowedModules = ROLE_PERMISSIONS[userRole] || [];
    
    if (!allowedModules.some(allowedModule => allowedModule === module)) {
      return res.status(403).json({ 
        error: `Нет доступа к модулю: ${module}`,
        role: req.user.role
      });
    }

    next();
  };
};