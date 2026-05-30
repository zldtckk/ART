import db from './schema.js';

const studios = [
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
];

const seedStudios = () => {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM studios').get();
  if (existing.cnt > 0) {
    console.log(`Skipping seed: ${existing.cnt} studios already exist.`);
    return;
  }

  const insert = db.prepare(
    'INSERT INTO studios (name, district, description) VALUES (?, ?, ?)'
  );

  const tx = db.transaction(() => {
    for (const s of studios) {
      insert.run(s.name, s.district, s.description);
    }
  });

  tx();
  console.log(`Seeded ${studios.length} studios.`);
};

const seedAdmin = () => {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?').get('circle_master');
  if (existing.cnt > 0) {
    console.log('Admin user already exists, skipping.');
    return;
  }

  db.prepare(`
    INSERT INTO users (nickname, studio_id, class_name, role, real_name, is_verified, verification_status)
    VALUES (?, ?, ?, ?, ?, 1, 'approved')
  `).run('管理员', 1, '管理', 'admin', '管理员');
  console.log('Seeded admin user: 管理员');
};

const seedPosts = () => {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM posts').get();
  if (existing.cnt > 6) {
    console.log('Posts already seeded, skipping.');
    return;
  }

  // 先清空旧测试数据
  db.exec('DELETE FROM likes');
  db.exec('DELETE FROM comments');
  db.exec('DELETE FROM posts');

  const posts = [
    { content: '今天色彩课画了一组陶罐和苹果，老师帮我改画的时候说暗部颜色太脏了，要多加环境色。画了一上午改了三次终于有点感觉了，离联考还有三个月，加油！', circle_type: 'general', like_count: 24, comment_count: 8 },
    { content: '深夜画室只剩我一个人了，听着铅笔在纸上的沙沙声真的很治愈。虽然每天都很累，但看到自己一天天进步就觉得值得。有同样的同学吗？', circle_type: 'general', like_count: 56, comment_count: 12 },
    { content: '真的累了，今天从早上八点画到晚上十一点，手都是抖的。回寝室倒头就睡，明天继续吧。集训第67天，还有100天，坚持！', circle_type: 'anonymous', like_count: 89, comment_count: 23 },
    { content: '刚模考完色彩，题目是"窗边的静物"。我画了一组在窗台上的陶罐和水果，用了比较暖的色调。老师说我这次构图有进步，但塑造还可以再深入一些。', circle_type: 'general', like_count: 15, comment_count: 5 },
    { content: '画室来了两只流浪猫，每天中午吃饭的时候就在门口蹲着等投喂。我们给它取名"素描"和"色彩"，哈哈哈哈', circle_type: 'general', like_count: 67, comment_count: 18 },
    { content: '有没有人出二手画材？想收一些灰色系的软炭，还有樱花橡皮。最近的炭笔总断芯，好烦😭', circle_type: 'other', like_count: 8, comment_count: 14 },
    { content: '杭州这几天降温了，画室窗户关不严实，冷风直往里灌。大家注意保暖别感冒了，这时候生病太耽误课了。', circle_type: 'help', like_count: 32, comment_count: 6 },
    { content: '今天老师让我们练习速写动态，画了50个不同姿势的人物剪影。前20个完全画崩了，后来慢慢找到感觉了，果然还是要多练！', circle_type: 'general', like_count: 41, comment_count: 7 },
    { content: '本社恐人在画室一个月了还是没什么朋友，大家都是自己画自己的。好想像其他同学那样能聊到一起，但我不知道怎么开口……', circle_type: 'anonymous', like_count: 103, comment_count: 45 },
    { content: '分享一组我最近画的石膏像，海盗和伏尔泰。老师说我造型能力有提升，但明暗交界线处理得还不够干脆。继续肝！', circle_type: 'general', like_count: 38, comment_count: 9 },
    { content: '今天画室组织去看国美毕业展了，那些作品真的绝了！给了我好多灵感，回画室后就迫不及待想尝试新的表现手法。', circle_type: 'general', like_count: 27, comment_count: 4 },
    { content: '食堂今天的红烧肉好好吃！！我干了三碗饭，同桌都惊了。果然画画费脑子，饭量大增。', circle_type: 'general', like_count: 45, comment_count: 11 },
  ];

  const insertPost = db.prepare(`
    INSERT INTO posts (user_id, studio_id, board, circle_type, content, is_anonymous, is_public, like_count, comment_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const insertLike = db.prepare(`
    INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)
  `);

  const insertComment = db.prepare(`
    INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)
  `);

  const tx = db.transaction(() => {
    posts.forEach((p, idx) => {
      const isAnon = p.circle_type === 'anonymous' ? 1 : 0;
      const hoursAgo = `-${idx * 3} hours`;
      const result = insertPost.run(1, 1, 'circle', p.circle_type, p.content, isAnon, 1, p.like_count, p.comment_count, hoursAgo);
      const postId = result.lastInsertRowid;

      // 添加一些点赞记录（用圈主模拟点赞）
      for (let i = 0; i < Math.min(p.like_count, 5); i++) {
        insertLike.run(postId, 1);
      }

      // 添加一些评论
      const comments = [
        '同感！！我也是这样',
        '加油呀，一起努力💪',
        '说得太好了吧',
        '真实了哈哈哈哈',
        '确实是这样，没办法',
      ];
      for (let i = 0; i < Math.min(p.comment_count, 3); i++) {
        insertComment.run(postId, 1, comments[i % comments.length]);
      }
    });
  });

  tx();
  console.log(`Seeded ${posts.length} sample posts with likes and comments.`);
};

seedStudios();
seedAdmin();
seedPosts();
