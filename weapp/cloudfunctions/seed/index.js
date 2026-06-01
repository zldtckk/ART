const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admins').where({ openid }).count();
  return res.total > 0;
}

exports.main = async (event) => {
  // 仅管理员可调用，防止任何人 force:true 清库
  if (!(await isAdmin(cloud.getWXContext().OPENID))) return { code: -1, msg: '仅管理员可操作' };

  // Only seed if posts collection is empty (unless force=true)
  const count = await db.collection('posts').count();
  if (count.total > 0 && !event.force) return { code: 0, msg: 'already seeded, skipped' };

  // If force, clean existing data first
  if (event.force && count.total > 0) {
    const allPosts = await db.collection('posts').get();
    for (const p of allPosts.data) {
      await db.collection('posts').doc(p._id).remove();
    }
    const allComments = await db.collection('comments').get();
    for (const c of allComments.data) {
      await db.collection('comments').doc(c._id).remove();
    }
  }

  const now = db.serverDate();
  const results = {};

  // Create a mock user if none exist
  const userCount = await db.collection('users').count();
  if (userCount.total === 0) {
    await db.collection('users').add({
      data: {
        _openid: 'seed-user-001',
        nickname: '小画家阿明',
        avatar_url: '',
        role: 'student',
        is_verified: true,
        verification_status: 'approved',
        studio_id: '',
        class_name: '高三(1)班',
        createTime: now,
      },
    });
  }

  // Get studios for reference
  const studios = await db.collection('studios').get();

  const posts = [
    {
      _openid: 'seed-user-001',
      board: 'circle',
      circle_type: 'general',
      title: '',
      content: '今天在老鹰画室画了一整天的素描，手都快断了😂 不过看到自己进步还是很有成就感的！有没有一起备考国美的同学？',
      images: [],
      is_anonymous: false,
      is_public: true,
      like_count: 23,
      comment_count: 5,
      createTime: now,
      updateTime: now,
    },
    {
      _openid: 'seed-user-001',
      board: 'circle',
      circle_type: 'help',
      title: '',
      content: '求助！色彩静物的冷暖关系总是处理不好，特别是暗部的反光，有没有大佬能指点一下？',
      images: [],
      is_anonymous: false,
      is_public: true,
      like_count: 15,
      comment_count: 8,
      createTime: now,
      updateTime: now,
    },
    {
      _openid: 'seed-user-001',
      board: 'circle',
      circle_type: 'treehole',
      title: '',
      content: '今天被老师骂了…说我的速写线条太死板。有点难过，但我知道老师是为我好。加油吧！',
      images: [],
      is_anonymous: true,
      is_public: true,
      like_count: 42,
      comment_count: 12,
      createTime: now,
      updateTime: now,
    },
    {
      _openid: 'seed-user-001',
      board: 'circle',
      circle_type: 'carpool',
      title: '',
      content: '周末从滨江去富阳厚一学堂，有拼车的吗？周五下午出发，周日回来，还能坐2个人。',
      images: [],
      is_anonymous: false,
      is_public: true,
      like_count: 8,
      comment_count: 3,
      createTime: now,
      updateTime: now,
    },
    {
      _openid: 'seed-user-001',
      board: 'circle',
      circle_type: 'general',
      title: '',
      content: '分享一个速写小技巧：画人物动态的时候，先抓大动态线，再填充细节。我试了一个月，进步明显！',
      images: [],
      is_anonymous: false,
      is_public: true,
      like_count: 31,
      comment_count: 7,
      createTime: now,
      updateTime: now,
    },
    {
      _openid: 'seed-user-001',
      board: 'market',
      market_tag: 'sell',
      market_category: 'art_supplies',
      title: '',
      content: '出二手马利水粉颜料一套，48色，只用过两次，几乎全新。原价280，现价150出。滨江区自提。',
      images: [],
      is_anonymous: false,
      is_public: true,
      like_count: 10,
      comment_count: 4,
      createTime: now,
      updateTime: now,
    },
    {
      _openid: 'seed-user-001',
      board: 'market',
      market_tag: 'buy',
      market_category: 'textbooks',
      title: '',
      content: '求购《伯里曼人体结构绘画教学》一本，不要太旧的，有的同学请留言或私信我～',
      images: [],
      is_anonymous: false,
      is_public: true,
      like_count: 5,
      comment_count: 2,
      createTime: now,
      updateTime: now,
    },
    {
      _openid: 'seed-user-001',
      board: 'market',
      market_tag: 'free',
      market_category: 'other',
      title: '',
      content: '搬家免费送画架一个，有点旧但还能用。西湖区老鹰画室附近，需要的来拿。',
      images: [],
      is_anonymous: false,
      is_public: true,
      like_count: 18,
      comment_count: 9,
      createTime: now,
      updateTime: now,
    },
    {
      _openid: 'seed-user-001',
      board: 'circle',
      circle_type: 'general',
      title: '',
      content: '国美复试成绩出来了！！我过了！！开心到飞起🎉🎉 努力没有白费！',
      images: [],
      is_anonymous: false,
      is_public: true,
      like_count: 67,
      comment_count: 20,
      createTime: now,
      updateTime: now,
    },
    {
      _openid: 'seed-user-001',
      board: 'circle',
      circle_type: 'lunch',
      title: '',
      content: '有没有在白墙画室附近的朋友？中午一起拼饭啊，天天吃食堂快受不了了😂 我知道附近有家不错的川菜馆。',
      images: [],
      is_anonymous: false,
      is_public: true,
      like_count: 6,
      comment_count: 5,
      createTime: now,
      updateTime: now,
    },
  ];

  for (const p of posts) {
    await db.collection('posts').add({ data: p });
  }
  results.posts = posts.length;

  // Add some comments
  const postList = await db.collection('posts').get();
  if (postList.data.length > 0) {
    const p1 = postList.data[0]._id;
    const p2 = postList.data[1]._id;
    const comments = [
      { post_id: p1, content: '加油！我也在备考国美', _openid: 'seed-user-001', createTime: now },
      { post_id: p1, content: '素描真的需要大量练习，坚持就是胜利', _openid: 'seed-user-001', createTime: now },
      { post_id: p1, content: '一起加油💪', _openid: 'seed-user-001', createTime: now },
      { post_id: p2, content: '暗部反光可以试试加点环境色', _openid: 'seed-user-001', createTime: now },
      { post_id: p2, content: '建议多看看莫兰迪的作品', _openid: 'seed-user-001', createTime: now },
      { post_id: p2, content: '冷暖不是绝对的，要看整体关系', _openid: 'seed-user-001', createTime: now },
    ];
    for (const c of comments) {
      await db.collection('comments').add({ data: c });
    }
    results.comments = comments.length;
  }

  return { code: 0, results };
};
