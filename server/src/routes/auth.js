import { Router } from 'express';
import https from 'https';
import db from '../db/schema.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取画室列表（注册时选择）
router.get('/studios', (req, res) => {
  const studios = db.prepare('SELECT id, name, district, description FROM studios ORDER BY district, name').all();
  res.json({ studios });
});

// 生成随机系统ID（8位数字）
const generateSysUserId = () => {
  const chars = '0123456789';
  let id;
  do {
    id = '';
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * 10)];
  } while (db.prepare('SELECT id FROM users WHERE sys_user_id = ?').get(id));
  return id;
};


// 获取圈主信息（供用户联系）
router.get('/circle-master', (req, res) => {
  const master = db.prepare("SELECT id, nickname, avatar_url FROM users WHERE role IN ('admin', 'circle_master') ORDER BY role LIMIT 1").get();
  res.json({ master: master || null });
});

// 提交认证申请（人工审核）
router.post('/verify', authMiddleware, (req, res) => {
  const { real_name, student_id_url, studio_id, class_name } = req.body;

  if (!real_name) {
    return res.status(400).json({ error: '请填写真实姓名' });
  }

  // 更新画室（如果提供了studio_id）
  if (studio_id) {
    const studio = db.prepare('SELECT id FROM studios WHERE id = ?').get(studio_id);
    if (!studio) return res.status(400).json({ error: '画室不存在' });
    db.prepare('UPDATE users SET studio_id = ? WHERE id = ?').run(studio_id, req.user.id);
  } else {
    // 未选画室
    const user = db.prepare('SELECT studio_id FROM users WHERE id = ?').get(req.user.id);
    if (!user.studio_id) {
      return res.status(400).json({ error: '请先选择画室' });
    }
  }

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (existing.verification_status === 'pending') {
    return res.status(400).json({ error: '已有审核中的申请，请耐心等待' });
  }
  if (existing.verification_status === 'approved') {
    return res.status(400).json({ error: '你已通过认证' });
  }

  db.prepare(`
    UPDATE users SET real_name = ?, student_id_url = ?, class_name = ?, verification_status = 'pending', verification_method = 'upload'
    WHERE id = ?
  `).run(real_name, student_id_url || '', class_name || '', req.user.id);

  // 通知管理员有新认证申请
  const userInfo = db.prepare('SELECT nickname FROM users WHERE id = ?').get(req.user.id);
  const admins = db.prepare("SELECT id FROM users WHERE role IN ('admin', 'circle_master')").all();
  const notifStmt = db.prepare(
    'INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)'
  );
  for (const admin of admins) {
    notifStmt.run(admin.id, 'verify_result', '新认证申请', `${userInfo.nickname} 提交了画室认证申请，请审核`);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// 审核用户认证（圈主/管理员操作）
router.post('/review/:userId', authMiddleware, (req, res) => {
  const { action } = req.body; // 'approve' or 'reject'

  const reviewer = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (reviewer.role !== 'admin' && reviewer.role !== 'circle_master') {
    return res.status(403).json({ error: '仅管理员可审核' });
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!target || target.verification_status !== 'pending') {
    return res.status(400).json({ error: '该用户没有待审核的申请' });
  }

  if (action === 'approve') {
    db.prepare('UPDATE users SET is_verified = 1, verification_status = \'approved\' WHERE id = ?')
      .run(req.params.userId);
    db.prepare(
      'INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)'
    ).run(req.params.userId, 'verify_result', '认证通过', '你的画室认证申请已通过，现在可以发帖、评论和点赞了');
    return res.json({ message: '已通过认证' });
  }

  if (action === 'reject') {
    db.prepare('UPDATE users SET verification_status = \'rejected\' WHERE id = ?')
      .run(req.params.userId);
    db.prepare(
      'INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)'
    ).run(req.params.userId, 'verify_result', '认证未通过', '你的画室认证申请未通过，可以重新提交认证信息');
    return res.json({ message: '已拒绝认证申请' });
  }

  res.status(400).json({ error: '无效操作' });
});

// 获取待审核列表
router.get('/pending-verifications', authMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.nickname, u.username, u.real_name, u.class_name, u.student_id_url,
           s.name as studio_name
    FROM users u
    LEFT JOIN studios s ON u.studio_id = s.id
    WHERE u.verification_status = 'pending'
    ORDER BY u.created_at ASC
  `).all();
  res.json({ users });
});

// 获取认证状态
router.get('/verify-status', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT u.is_verified, u.real_name, u.verification_method,
           u.student_id_url,
           s.name as studio_name
    FROM users u
    LEFT JOIN studios s ON u.studio_id = s.id
    WHERE u.id = ?
  `).get(req.user.id);
  res.json({ verification: user });
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT u.*, s.name as studio_name, s.district as studio_district
    FROM users u
    LEFT JOIN studios s ON u.studio_id = s.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) return res.status(404).json({ error: '用户不存在' });

  res.json({ user });
});

// 更新用户资料
router.put('/profile', authMiddleware, (req, res) => {
  const { nickname, avatar_url, class_name, phone } = req.body;
  const updates = [];
  const values = [];

  if (nickname !== undefined) { updates.push('nickname = ?'); values.push(nickname); }
  if (avatar_url !== undefined) { updates.push('avatar_url = ?'); values.push(avatar_url); }
  if (class_name !== undefined) { updates.push('class_name = ?'); values.push(class_name); }
  if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }

  if (updates.length === 0) return res.status(400).json({ error: '没有要更新的内容' });

  values.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// 微信小程序登录
function wechatHttpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

router.post('/wx-login', async (req, res) => {
  try {
    // 优先使用云托管自动注入的 X-WX-OPENID（不走微信API，更可靠）
    const headerOpenid = req.headers['x-wx-openid'];
    if (headerOpenid) {
      let user = db.prepare('SELECT * FROM users WHERE wx_openid = ?').get(headerOpenid);
      if (!user) {
        const nickname = `微信用户${Math.random().toString(36).slice(2, 6)}`;
        const sys_user_id = generateSysUserId();
        const result = db.prepare(`
          INSERT INTO users (nickname, wx_openid, sys_user_id, is_verified)
          VALUES (?, ?, ?, 0)
        `).run(nickname, headerOpenid, sys_user_id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      }
      const token = generateToken(user);
      return res.json({ token, user });
    }

    // 备用：走 code + jscode2session
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: '缺少 code' });

    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;
    if (!appid || !secret) {
      return res.status(500).json({ error: '微信登录未配置' });
    }

    const data = await wechatHttpsGet(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    );
    if (data.errcode) {
      console.error('wx.login error:', data);
      return res.status(400).json({ error: '微信登录失败' });
    }

    const { openid } = data;
    let user = db.prepare('SELECT * FROM users WHERE wx_openid = ?').get(openid);

    if (!user) {
      const nickname = `微信用户${Math.random().toString(36).slice(2, 6)}`;
      const sys_user_id = generateSysUserId();
      const result = db.prepare(`
        INSERT INTO users (nickname, wx_openid, sys_user_id, is_verified)
        VALUES (?, ?, ?, 0)
      `).run(nickname, openid, sys_user_id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error('wx-login error:', err);
    res.status(500).json({ error: '微信登录失败' });
  }
});

// 临时调试：将当前用户设为圈主（仅开发阶段使用）
router.post('/make-admin', authMiddleware, (req, res) => {
  db.prepare("UPDATE users SET role = 'admin', is_verified = 1, verification_status = 'approved' WHERE id = ?")
    .run(req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  console.log(`[make-admin] User ${user.nickname} (id=${user.id}) promoted to admin`);
  res.json({ message: '已设为圈主', user });
});

export default router;
