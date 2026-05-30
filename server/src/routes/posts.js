import { Router } from 'express';
import db from '../db/schema.js';
import { authMiddleware, optionalAuth, verifiedOnly } from '../middleware/auth.js';

const router = Router();

// 获取圈子帖子列表
router.get('/', optionalAuth, (req, res) => {
  const { board, studio_id, circle_type, sort, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `
    SELECT p.*, u.nickname, u.avatar_url,
           s.name as studio_name,
           CASE WHEN p.is_anonymous = 1 THEN NULL ELSE u.nickname END as display_name,
           CASE WHEN p.is_anonymous = 1 THEN NULL ELSE u.avatar_url END as display_avatar
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN studios s ON p.studio_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (board) {
    sql += ' AND p.board = ?';
    params.push(board);
  }

  if (studio_id) {
    sql += ' AND p.studio_id = ?';
    params.push(studio_id);
  }

  if (circle_type && circle_type !== 'all') {
    sql += ' AND p.circle_type = ?';
    params.push(circle_type);
  }

  // 未认证用户只能看公开帖子
  if (!req.user) {
    sql += ' AND p.is_public = 1';
  }

  // 非本画室成员不能看非公开
  if (req.user && studio_id && parseInt(studio_id) !== req.user.studio_id) {
    sql += ' AND p.is_public = 1';
  }

  if (sort === 'hot') {
    sql += ' ORDER BY (p.like_count * 2 + p.comment_count) DESC, p.created_at DESC';
  } else {
    sql += ' ORDER BY p.created_at DESC';
  }
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const posts = db.prepare(sql).all(...params);

  // 获取当前用户点赞状态
  let likedPostIds = new Set();
  if (req.user && posts.length > 0) {
    const likes = db.prepare(
      'SELECT post_id FROM likes WHERE user_id = ? AND post_id IN (' +
      posts.map(() => '?').join(',') + ')'
    ).all(req.user.id, ...posts.map(p => p.id));
    likedPostIds = new Set(likes.map(l => l.post_id));
  }

  const total = db.prepare('SELECT COUNT(*) as cnt FROM posts').get().cnt;

  res.json({
    posts: posts.map(p => ({
      ...p,
      is_liked: likedPostIds.has(p.id),
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      has_more: offset + parseInt(limit) < total,
    }
  });
});

// 获取单个帖子详情
router.get('/:id', optionalAuth, (req, res) => {
  const post = db.prepare(`
    SELECT p.*,
           CASE WHEN p.is_anonymous = 1 THEN NULL ELSE u.nickname END as display_name,
           CASE WHEN p.is_anonymous = 1 THEN NULL ELSE u.avatar_url END as display_avatar,
           u.nickname, u.avatar_url,
           s.name as studio_name
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN studios s ON p.studio_id = s.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!post) return res.status(404).json({ error: '帖子不存在' });

  let is_liked = false;
  if (req.user) {
    const like = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    is_liked = !!like;
  }

  const comments = db.prepare(`
    SELECT c.*,
           CASE WHEN p.is_anonymous = 1 THEN '匿名用户' ELSE u.nickname END as display_name,
           CASE WHEN p.is_anonymous = 1 THEN NULL ELSE u.avatar_url END as display_avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    JOIN posts p ON c.post_id = p.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);

  res.json({ post: { ...post, is_liked }, comments });
});

// 发布帖子
router.post('/', authMiddleware, verifiedOnly, (req, res) => {
  const { content, title, circle_type, images, is_anonymous, studio_id, is_public, price, item_condition, market_tag, market_category } = req.body;

  if (!content) {
    return res.status(400).json({ error: '内容不能为空' });
  }

  const validTypes = ['general', 'help', 'anonymous', 'carpool', 'food', 'other'];
  const type = validTypes.includes(circle_type) ? circle_type : 'general';

  const validBoards = ['circle', 'market', 'fan'];
  const board = validBoards.includes(req.body.board) ? req.body.board : 'circle';

  const validMarketTags = ['buy', 'sell', 'giveaway'];
  const mtag = validMarketTags.includes(market_tag) ? market_tag : 'sell';

  const validMarketCategories = ['free', 'art_supplies', 'books', 'other'];
  const mcat = validMarketCategories.includes(market_category) ? market_category : 'art_supplies';

  const result = db.prepare(`
    INSERT INTO posts (user_id, studio_id, board, circle_type, title, content, images, is_anonymous, is_public, price, item_condition, market_tag, market_category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    studio_id || req.user.studio_id,
    board,
    type,
    title || '',
    content,
    JSON.stringify(images || []),
    is_anonymous ? 1 : 0,
    is_public !== undefined ? (is_public ? 1 : 0) : 1,
    price || null,
    item_condition || null,
    mtag,
    mcat
  );

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ post });
});

// 删除帖子
router.delete('/:id', authMiddleware, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!post) return res.status(404).json({ error: '帖子不存在或无权限删除' });

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM comments WHERE post_id = ?').run(req.params.id);
  db.prepare('DELETE FROM likes WHERE post_id = ?').run(req.params.id);

  res.json({ message: '已删除' });
});

// 点赞/取消点赞
router.post('/:id/like', authMiddleware, verifiedOnly, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const existing = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (existing) {
    db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?')
      .run(req.params.id, req.user.id);
    db.prepare('UPDATE posts SET like_count = like_count - 1 WHERE id = ?')
      .run(req.params.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)')
      .run(req.params.id, req.user.id);
    db.prepare('UPDATE posts SET like_count = like_count + 1 WHERE id = ?')
      .run(req.params.id);
    res.json({ liked: true });
  }
});

// 评论帖子
router.post('/:id/comments', authMiddleware, verifiedOnly, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '评论内容不能为空' });

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)')
    .run(req.params.id, req.user.id, content);
  db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?')
    .run(req.params.id);

  const comment = db.prepare(`
    SELECT c.*, u.nickname as display_name, u.avatar_url as display_avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = last_insert_rowid()
  `).get();

  res.status(201).json({ comment });
});

export default router;
