import jwt from 'jsonwebtoken';
import db from '../db/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'huashi-dev-secret-key-change-in-production';

export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, studio_id: user.studio_id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '登录过期，请重新登录' });
  }
};

export const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
};

export const verifiedOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '未登录' });
  }
  // 从数据库获取最新的 is_verified 状态
  const user = db.prepare('SELECT is_verified FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.is_verified) {
    return res.status(403).json({ error: '请先完成画室认证', code: 'NOT_VERIFIED' });
  }
  next();
};
