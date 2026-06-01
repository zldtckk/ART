const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admins').where({ openid }).count();
  return res.total > 0;
}

exports.main = async () => {
  // 仅管理员可调用，防止重复插入画室/认证码
  if (!(await isAdmin(cloud.getWXContext().OPENID))) return { code: -1, msg: '仅管理员可操作' };

  const results = {};

  // 1. 预置画室
  const studios = [
    { name: '老鹰画室', district: '西湖区' },
    { name: '白墙画室', district: '滨江区' },
    { name: '孪生画室', district: '西湖区' },
    { name: '将军画室', district: '余杭区' },
    { name: '厚一学堂', district: '富阳区' },
    { name: '大象画室', district: '萧山区' },
    { name: '正向画室', district: '西湖区' },
    { name: '东昱画室', district: '滨江区' },
  ];
  for (const s of studios) {
    await db.collection('studios').add({ data: { ...s, description: '', cover_url: '', createTime: db.serverDate() } });
  }
  results.studios = studios.length;

  // 2. 预置认证码
  const studioList = await db.collection('studios').get();
  for (const s of studioList.data) {
    const code = s.name + '2026';
    await db.collection('verification_codes').add({
      data: { code, studio_id: s._id, is_used: false, createTime: db.serverDate() },
    });
  }
  results.verification_codes = studioList.data.length;

  // 3. Create empty docs to ensure all collections exist
  const collections = ['users', 'posts', 'comments', 'likes', 'favorites', 'follows', 'conversations', 'messages', 'notifications'];
  for (const col of collections) {
    try {
      const existing = await db.collection(col).count();
      results[col] = `exists (${existing.total} docs)`;
    } catch (e) {
      results[col] = 'needs manual creation in console';
    }
  }

  return { code: 0, results };
};
