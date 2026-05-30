import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

import './db/schema.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import messageRoutes from './routes/messages.js';
import userRoutes from './routes/users.js';
import seedRoutes, { seedDatabase } from './routes/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 80;
const SERVICE_BASE_URL = process.env.SERVICE_BASE_URL || ''; // CloudBase 服务域名，用于返回图片完整 URL

function fullUrl(path) {
  return SERVICE_BASE_URL ? SERVICE_BASE_URL + path : path;
}

// 压缩图片并保存，返回文件名
async function compressAndSaveImage(buffer, uploadDir) {
  const name = `${uuidv4()}.jpg`;
  await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true }) // 最长边不超过 1200px
    .jpeg({ quality: 80 })
    .toFile(path.join(uploadDir, name));
  return name;
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 头像上传
const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

import { authMiddleware } from './middleware/auth.js';
import db from './db/schema.js';

app.post('/api/upload/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择图片' });
  const url = `/uploads/avatars/${req.file.filename}`;
  const resultUrl = fullUrl(url);
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(resultUrl, req.user.id);
  res.json({ avatar_url: resultUrl });
});

// 头像上传（base64，供小程序使用）
app.post('/api/upload/avatar-base64', authMiddleware, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: '请选择图片' });
    const buf = Buffer.from(data, 'base64');
    const name = await compressAndSaveImage(buf, uploadDir);
    const url = `/uploads/avatars/${name}`;
    const resultUrl = fullUrl(url);
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(resultUrl, req.user.id);
    res.json({ avatar_url: resultUrl });
  } catch (e) {
    console.error('[upload avatar]', e);
    res.status(500).json({ error: '上传失败' });
  }
});

// 校园卡/学生证上传（2MB限制）
const studentIdUpload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });
app.post('/api/upload/student-id', authMiddleware, (req, res) => {
  studentIdUpload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: '图片不能超过2MB' });
      return res.status(400).json({ error: '上传失败' });
    }
    if (err) return res.status(400).json({ error: '上传失败' });
    if (!req.file) return res.status(400).json({ error: '请选择图片' });
    const url = `/uploads/avatars/${req.file.filename}`;
    res.json({ url: fullUrl(url) });
  });
});

// 校园卡/学生证上传（base64，供小程序使用）
app.post('/api/upload/student-id-base64', authMiddleware, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: '请选择图片' });
    const buf = Buffer.from(data, 'base64');
    if (buf.length > 10 * 1024 * 1024) return res.status(400).json({ error: '图片不能超过10MB' });
    const name = await compressAndSaveImage(buf, uploadDir);
    res.json({ url: fullUrl(`/uploads/avatars/${name}`) });
  } catch (e) {
    console.error('[upload student-id]', e);
    res.status(500).json({ error: '上传失败' });
  }
});

// 帖子图片上传（5MB限制，供小程序使用）
const postImageUpload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
app.post('/api/upload/post-image', authMiddleware, (req, res) => {
  postImageUpload.single('image')(req, (err) => {
    if (err) return res.status(400).json({ error: '上传失败' });
    if (!req.file) return res.status(400).json({ error: '请选择图片' });
    res.json({ url: fullUrl(`/uploads/avatars/${req.file.filename}`) });
  });
});

// 帖子图片上传（base64方式，供小程序callContainer使用）
app.post('/api/upload/post-image-base64', authMiddleware, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: '请选择图片' });
    const buf = Buffer.from(data, 'base64');
    const name = await compressAndSaveImage(buf, uploadDir);
    res.json({ url: fullUrl(`/uploads/avatars/${name}`) });
  } catch (e) {
    console.error('[upload post-image]', e);
    res.status(500).json({ error: '上传失败' });
  }
});

// 添加画室（管理员/圈主）
app.post('/api/studios', authMiddleware, (req, res) => {
  const { name, district } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '请输入画室名称' });

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
  if (!user || (user.role !== 'admin' && user.role !== 'circle_master')) {
    return res.status(403).json({ error: '无权限' });
  }

  const existing = db.prepare('SELECT id FROM studios WHERE name = ?').get(name.trim());
  if (existing) return res.status(400).json({ error: '画室已存在' });

  db.prepare('INSERT INTO studios (name, district) VALUES (?, ?)').run(name.trim(), (district || '').trim());
  res.json({ message: '添加成功' });
});

// 健康检查（云托管需要）
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api', seedRoutes);

// Static files (built frontend)
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 画室圈 API running on port ${PORT}`);
  try {
    const result = seedDatabase();
    if (result && !result.skipped) {
      console.log('🌱 Auto-seeded test data:', result);
    }
  } catch (e) {
    console.error('Auto-seed error:', e);
  }
});
