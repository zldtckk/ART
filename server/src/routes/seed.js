import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/schema.js';

const router = Router();

const seedData = {
  studios: [
    { name: '老鹰画室', district: '转塘', description: '杭州老牌美术集训画室，转塘校区' },
    { name: '白塔岭画室', district: '转塘', description: '杭州知名画室，转塘校区' },
    { name: '孪生画室', district: '转塘', description: '杭州孪生画室，转塘校区' },
    { name: '厚一画室', district: '转塘', description: '杭州厚一画室' },
    { name: '大象画室', district: '转塘', description: '杭州大象画室，转塘校区' },
    { name: '水木源画室', district: '转塘', description: '杭州水木源画室' },
    { name: '之江画室', district: '转塘', description: '杭州之江画室' },
    { name: '万松岭画室', district: '转塘', description: '杭州万松岭画室' },
    { name: '吴越画室', district: '转塘', description: '杭州吴越画室' },
    { name: '东昱画室', district: '转塘', description: '杭州东昱画室' },
    { name: '杭州白墙画室', district: '银湖', description: '杭州白墙画室，银湖校区' },
    { name: '杭州灰色调画室', district: '银湖', description: '杭州灰色调画室' },
    { name: '杭州南山画室', district: '美院周边', description: '杭州南山画室，美院周边' },
  ],
  circlePosts: [
    { content: '大家素描一般用什么炭笔啊？我一直在用马利的，但感觉最近断芯特别严重，求推荐', type: 'help' },
    { content: '周末有没有人想去浙美看展？最近有个中国美院毕业生作品展，听说很不错', type: 'carpool' },
    { content: '晚上画室点外卖有没有一起的？凑个起送价', type: 'food' },
    { content: '联考倒计时越来越近了，每天睁眼就是画板闭眼就是静物，压力大到失眠', type: 'anonymous' },
    { content: '今天被老师表扬了说我最近色彩进步很大！开心！付出还是有回报的💪', type: 'general' },
    { content: '有没有人一起拼单买炭笔？整箱买划算很多，米娅的软炭14一盒，买十盒送一盒', type: 'food' },
    { content: '色彩怎么画好灰色调啊？每次画出来要么太粉要么太脏，老师说我观察不够', type: 'help' },
    { content: '今天下乡写生去了宏村，风景太好了！画了一整天都不想回来', type: 'general' },
    { content: '不想画画了，感觉自己根本没有天赋，别人画两个小时比我画一天都好', type: 'anonymous' },
    { content: '画室附近有什么好吃的吗？这边的外卖都吃腻了', type: 'other' },
    { content: '杭州最近下雨下得人都要发霉了，画室空气都是潮的，纸都软了', type: 'other' },
    { content: '速写真的太难了！动态怎么抓都抓不准，画出来的人跟木棍一样僵硬', type: 'help' },
    { content: '听说今年联考改革了，速写改成创作了？有没有人知道具体什么情况', type: 'other' },
    { content: '凌晨两点，画室还有十几个人在加班。有时候觉得这条路真的走对了，虽然辛苦但很充实', type: 'general' },
    { content: '今天在画室闻到楼下食堂的红烧肉香味，馋了一下午，晚上直接干了两碗饭', type: 'food' },
    { content: '谁来救救我的素描！黑白灰关系总是拉不开，画出来灰蒙蒙一片', type: 'help' },
    { content: '周末想出去透透气，有没有去西湖一起写生的？可以互相点评', type: 'carpool' },
    { content: '刚来画室一个月还是觉得融不进去，大家都有小团体了，我一个人吃饭画画', type: 'anonymous' },
    { content: '今天画长期作业画了三天终于画完了，虽然很累但特别有成就感', type: 'general' },
    { content: '今天色彩课画了一组陶罐和苹果，老师帮我改画的时候说暗部颜色太脏了，要多加环境色。', type: 'general' },
    { content: '深夜画室只剩我一个人了，听着铅笔在纸上的沙沙声真的很治愈。虽然每天都很累，但看到自己一点点进步就什么都值了。', type: 'general' },
    { content: '刚模考完色彩，题目是"窗边的静物"。我画了一组在窗台上的陶罐和水果，用了比较暖的色调，希望能拿个好成绩', type: 'general' },
    { content: '画室来了两只流浪猫，每天中午吃饭的时候就在门口蹲着等投喂。我们给它取名"素描"和"色彩"哈哈', type: 'other' },
    { content: '杭州这几天降温了，画室窗户关不严实，冷风直往里灌。大家注意保暖别感冒了，这时候生病太耽误进度了', type: 'other' },
    { content: '今天老师让我们练习速写动态，画了50个不同姿势的人物剪影。前20个完全画崩了，后面才慢慢找到感觉', type: 'general' },
  ],
  marketPosts: [
    { content: '出一盒全新樱花橡皮，12块装，买多了用不完', price: 18, tag: 'sell', cond: '全新' },
    { content: '收二手ipad pro 2018以上，画procreate用的，有的带价', price: 2500, tag: 'buy', cond: '' },
    { content: '出一整套米娅炭笔，软中硬各5盒，用了不到一半，转行不画了', price: 60, tag: 'sell', cond: '轻微使用痕迹' },
    { content: '收中国美院历年高分卷合集，有的联系', price: 50, tag: 'buy', cond: '' },
    { content: '出全新4K画板两块，买错了尺寸，低价出', price: 25, tag: 'sell', cond: '全新' },
    { content: '出明基WiT台灯，画室用了一年，照明范围大不伤眼', price: 800, tag: 'sell', cond: '有明显使用痕迹' },
    { content: '收电吹风，画室吹干画面用，便宜点的就行', price: 30, tag: 'buy', cond: '' },
    { content: '出一箱老人头素描纸8开，买了200张用了50张不到', price: 40, tag: 'sell', cond: '几乎全新' },
    { content: '收二手画架，最好是实木的，稳定一点的', price: 100, tag: 'buy', cond: '' },
    { content: '出水粉笔一盒，48色，用了不到10个颜色', price: 35, tag: 'sell', cond: '轻微使用痕迹' },
  ],
  commentTexts: [
    '确实，马利的炭笔最近质量下降了，推荐换米娅的试试',
    '我也想去！周末一起吗？',
    '加油加油，熬过去就好了！',
    '同感，速写真的太难了',
    '多练练就好了，大家都是这么过来的',
    '推荐去试试尼奥尼，比米娅还好用',
    '我也是这样，不过慢慢来总会进步的',
    '画室的猫真的可爱，每天的动力来源',
    '能分享一下写生的照片吗？',
    '老师说的对，暗部要多加环境色才有层次',
    '这个价格可以，我要了',
    '建议看看B站的教程视频，对我帮助很大',
    '请问你在哪个画室啊？',
    '杭州这几天确实冷，多穿点',
    '晚上一起吃饭吧！',
  ],
};

export function seedDatabase() {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM posts').get();
  if (existing && existing.cnt > 0) return { skipped: true, reason: '数据库已有数据' };

  const transaction = db.transaction(() => {
    // 1. Insert studios
    const studioInsert = db.prepare('INSERT OR IGNORE INTO studios (name, district, description) VALUES (?, ?, ?)');
    for (const s of seedData.studios) {
      studioInsert.run(s.name, s.district, s.description);
    }
    const studioIds = db.prepare('SELECT id FROM studios ORDER BY id').all().map(r => r.id);

    // 2. Create test users
    const userInsert = db.prepare(`
      INSERT OR IGNORE INTO users (nickname, username, password_hash, sys_user_id, is_verified, verification_status, role, studio_id)
      VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)
    `);
    const userNames = ['美术生小明', '素描小能手', '色彩达人', '速写大神', '画渣本渣', '熬夜画画人', '颜料吃土少女', '铅笔不离手', '杭州美术生', '联考冲冲冲'];
    for (const name of userNames) {
      const sysId = Math.floor(10000000 + Math.random() * 90000000).toString();
      userInsert.run(name, null, null, sysId, 1, 'student', studioIds[Math.floor(Math.random() * studioIds.length)]);
    }
    // Make first user the admin（用户名 admin，密码 admin123）
    const adminHash = bcrypt.hashSync('admin123', 10);
    const firstUser = db.prepare("SELECT id FROM users WHERE role = 'student' ORDER BY id LIMIT 1").get();
    if (firstUser) {
      db.prepare("UPDATE users SET role = 'admin', nickname = '圈主', username = 'admin', password_hash = ? WHERE id = ?").run(adminHash, firstUser.id);
    }
    const allUsers = db.prepare('SELECT id FROM users ORDER BY id').all();
    const allUserIds = allUsers.map(r => r.id);

    // 3. Insert circle posts
    const postInsert = db.prepare(`
      INSERT INTO posts (user_id, studio_id, board, circle_type, title, content, images, is_anonymous, like_count, comment_count, created_at)
      VALUES (?, ?, ?, ?, '', ?, '[]', ?, 0, 0, datetime('now', '-' || ? || ' hours'))
    `);
    const circlePostIds = [];
    for (const p of seedData.circlePosts) {
      const u = allUserIds[Math.floor(Math.random() * allUserIds.length)];
      const s = studioIds[Math.floor(Math.random() * studioIds.length)];
      const anon = p.type === 'anonymous' ? 1 : (Math.random() > 0.7 ? 1 : 0);
      const result = postInsert.run(u, s, 'circle', p.type, p.content, anon, Math.floor(Math.random() * 168));
      circlePostIds.push(result.lastInsertRowid);
    }

    // 4. Insert market posts
    const mpInsert = db.prepare(`
      INSERT INTO posts (user_id, studio_id, board, circle_type, title, content, images, is_anonymous, like_count, comment_count, market_tag, market_category, price, item_condition, created_at)
      VALUES (?, ?, ?, 'general', '', ?, '[]', 0, 0, 0, ?, ?, ?, ?, datetime('now', '-' || ? || ' hours'))
    `);
    const marketPostIds = [];
    for (const p of seedData.marketPosts) {
      const u = allUserIds[Math.floor(Math.random() * allUserIds.length)];
      const s = studioIds[Math.floor(Math.random() * studioIds.length)];
      const result = mpInsert.run(u, s, 'market', p.content, p.tag, 'art_supplies', p.price || 0, p.cond || '', Math.floor(Math.random() * 168));
      marketPostIds.push(result.lastInsertRowid);
    }

    const allPostIds = [...circlePostIds, ...marketPostIds];

    // 5. Add comments
    const cmInsert = db.prepare(`
      INSERT INTO comments (post_id, user_id, content, created_at)
      VALUES (?, ?, ?, datetime('now', '-' || ? || ' hours'))
    `);
    for (const pid of allPostIds) {
      const numComments = Math.floor(Math.random() * 8);
      for (let i = 0; i < numComments; i++) {
        const u = allUserIds[Math.floor(Math.random() * allUserIds.length)];
        const txt = seedData.commentTexts[Math.floor(Math.random() * seedData.commentTexts.length)];
        cmInsert.run(pid, u, txt, Math.floor(Math.random() * 168));
      }
    }

    // 6. Add likes
    const lkInsert = db.prepare('INSERT OR IGNORE INTO likes (post_id, user_id, created_at) VALUES (?, ?, datetime(\'now\', \'-\' || ? || \' hours\'))');
    for (const pid of allPostIds) {
      const numLikes = Math.floor(Math.random() * 15);
      const used = new Set();
      for (let i = 0; i < numLikes; i++) {
        const u = allUserIds[Math.floor(Math.random() * allUserIds.length)];
        if (!used.has(u)) {
          used.add(u);
          lkInsert.run(pid, u, Math.floor(Math.random() * 168));
        }
      }
    }

    // 7. Update counts
    db.prepare('UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id)').run();
    db.prepare('UPDATE posts SET like_count = (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id)').run();

    return {
      studios: seedData.studios.length,
      users: allUserIds.length,
      circlePosts: circlePostIds.length,
      marketPosts: marketPostIds.length,
    };
  });

  return transaction();
}

// 全量填充测试数据（仅开发用，无认证）
router.post('/seed', (req, res) => {
  try {
    const result = seedDatabase();
    res.json({ success: true, inserted: result });
  } catch (err) {
    console.error('seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
