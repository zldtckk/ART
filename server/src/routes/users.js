import { Router } from 'express';
import db from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT u.*, s.name as studio_name
    FROM users u
    LEFT JOIN studios s ON u.studio_id = s.id
    WHERE u.id = ?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  delete user.password_hash;
  res.json({ user });
});

// 用户统计数据（帖子数、评论数、收藏数）
router.get('/me/stats', authMiddleware, (req, res) => {
  const postCount = db.prepare('SELECT COUNT(*) as cnt FROM posts WHERE user_id = ?')
    .get(req.user.id).cnt;
  const commentCount = db.prepare('SELECT COUNT(*) as cnt FROM comments WHERE user_id = ?')
    .get(req.user.id).cnt;
  const favoriteCount = db.prepare('SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?')
    .get(req.user.id).cnt;
  res.json({ post_count: postCount, comment_count: commentCount, favorite_count: favoriteCount });
});

// 我的帖子
router.get('/me/posts', authMiddleware, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const posts = db.prepare(`
    SELECT p.*, s.name as studio_name
    FROM posts p
    LEFT JOIN studios s ON p.studio_id = s.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, parseInt(limit), offset);

  const total = db.prepare('SELECT COUNT(*) as cnt FROM posts WHERE user_id = ?')
    .get(req.user.id).cnt;

  res.json({
    posts,
    pagination: { page: parseInt(page), limit: parseInt(limit), total,
      has_more: offset + parseInt(limit) < total }
  });
});

// 我的评论
router.get('/me/comments', authMiddleware, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const comments = db.prepare(`
    SELECT c.*, p.content as post_preview, p.id as post_id
    FROM comments c
    JOIN posts p ON c.post_id = p.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, parseInt(limit), offset);

  const total = db.prepare('SELECT COUNT(*) as cnt FROM comments WHERE user_id = ?')
    .get(req.user.id).cnt;

  res.json({
    comments,
    pagination: { page: parseInt(page), limit: parseInt(limit), total,
      has_more: offset + parseInt(limit) < total }
  });
});

// 我的收藏
router.get('/me/favorites', authMiddleware, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const posts = db.prepare(`
    SELECT p.*, u.nickname, u.avatar_url, s.name as studio_name,
           f.created_at as favorited_at
    FROM favorites f
    JOIN posts p ON f.post_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN studios s ON p.studio_id = s.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, parseInt(limit), offset);

  const total = db.prepare('SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?')
    .get(req.user.id).cnt;

  res.json({
    posts,
    pagination: { page: parseInt(page), limit: parseInt(limit), total,
      has_more: offset + parseInt(limit) < total }
  });
});

// 收藏/取消收藏帖子
router.post('/posts/:id/favorite', authMiddleware, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const existing = db.prepare('SELECT id FROM favorites WHERE post_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE post_id = ? AND user_id = ?')
      .run(req.params.id, req.user.id);
    return res.json({ favorited: false });
  } else {
    db.prepare('INSERT INTO favorites (post_id, user_id) VALUES (?, ?)')
      .run(req.params.id, req.user.id);
    return res.json({ favorited: true });
  }
});

export default router;
