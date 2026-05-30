import { Router } from 'express';
import db from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取私信会话列表
router.get('/conversations', authMiddleware, (req, res) => {
  const conversations = db.prepare(`
    SELECT c.*,
           CASE WHEN c.user1_id = ? THEN u2.nickname ELSE u1.nickname END as peer_name,
           CASE WHEN c.user1_id = ? THEN u2.avatar_url ELSE u1.avatar_url END as peer_avatar,
           CASE WHEN c.user1_id = ? THEN u2.id ELSE u1.id END as peer_id
    FROM conversations c
    JOIN users u1 ON c.user1_id = u1.id
    JOIN users u2 ON c.user2_id = u2.id
    WHERE c.user1_id = ? OR c.user2_id = ?
    ORDER BY c.last_message_at DESC
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);

  // 统计未读消息数
  const enriched = conversations.map(c => {
    const unread = db.prepare(
      'SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND sender_id != ? AND is_read = 0'
    ).get(c.id, req.user.id).cnt;
    return { ...c, unread_count: unread };
  });

  res.json({ conversations: enriched });
});

// 创建或获取已有的私信会话
router.post('/conversations', authMiddleware, (req, res) => {
  const { peer_id } = req.body;
  if (!peer_id || peer_id === req.user.id) {
    return res.status(400).json({ error: '无效的对话对象' });
  }

  const user1 = Math.min(req.user.id, peer_id);
  const user2 = Math.max(req.user.id, peer_id);

  let conv = db.prepare(
    'SELECT * FROM conversations WHERE user1_id = ? AND user2_id = ?'
  ).get(user1, user2);

  if (!conv) {
    const result = db.prepare(
      'INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)'
    ).run(user1, user2);
    conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
  }

  res.json({ conversation: conv });
});

// 获取会话的消息列表
router.get('/conversations/:id/messages', authMiddleware, (req, res) => {
  const conv = db.prepare(
    'SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)'
  ).get(req.params.id, req.user.id, req.user.id);

  if (!conv) return res.status(404).json({ error: '会话不存在' });

  // 标记已读
  db.prepare(
    'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?'
  ).run(req.params.id, req.user.id);

  const messages = db.prepare(`
    SELECT m.*, u.nickname as sender_name
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
  `).all(req.params.id);

  res.json({ messages });
});

// 发送消息
router.post('/conversations/:id/messages', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  const conv = db.prepare(
    'SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)'
  ).get(req.params.id, req.user.id, req.user.id);

  if (!conv) return res.status(404).json({ error: '会话不存在' });

  const result = db.prepare(
    'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)'
  ).run(req.params.id, req.user.id, content.trim());

  db.prepare(
    'UPDATE conversations SET last_message = ?, last_message_at = datetime(\'now\') WHERE id = ?'
  ).run(content.trim(), req.params.id);

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ message });
});

// 获取系统通知
router.get('/notifications', authMiddleware, (req, res) => {
  const notifications = db.prepare(`
    SELECT n.*, p.content as post_preview
    FROM notifications n
    LEFT JOIN posts p ON n.related_post_id = p.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.id);

  // 系统通知未读数
  const notif_unread = db.prepare(
    'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(req.user.id).cnt;

  // 私信未读数（别人发给我的未读消息）
  const msg_unread = db.prepare(`
    SELECT COALESCE(SUM(cnt), 0) as total FROM (
      SELECT COUNT(*) as cnt
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.user1_id = ? OR c.user2_id = ?)
        AND m.sender_id != ?
        AND m.is_read = 0
      GROUP BY m.conversation_id
    )
  `).get(req.user.id, req.user.id, req.user.id).total;

  res.json({ notifications, unread_count: notif_unread + msg_unread });
});

// 标记单个通知已读
router.post('/notifications/:id/read', authMiddleware, (req, res) => {
  db.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id);
  res.json({ success: true });
});

// 标记全部已读
router.post('/notifications/read-all', authMiddleware, (req, res) => {
  db.prepare(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
  ).run(req.user.id);
  res.json({ success: true });
});

export default router;
