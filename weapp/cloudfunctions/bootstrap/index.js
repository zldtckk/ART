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

  // 多城市画室数据
  const allStudios = {
    hangzhou: [
      { name: '老鹰画室', district: '西湖区' },
      { name: '白墙画室', district: '滨江区' },
      { name: '孪生画室', district: '西湖区' },
      { name: '将军画室', district: '余杭区' },
      { name: '厚一学堂', district: '富阳区' },
      { name: '大象画室', district: '萧山区' },
      { name: '正向画室', district: '西湖区' },
      { name: '东昱画室', district: '滨江区' },
    ],
    guangzhou: [
      { name: '一尚画室', district: '海珠区' },
      { name: '新奇点画室', district: '增城区' },
      { name: '树华画室', district: '海珠区' },
      { name: '点绘画室', district: '南沙区' },
      { name: '同盟画室', district: '南沙区' },
      { name: '度岸画室', district: '海珠区' },
      { name: '江山艺术画室', district: '南沙区' },
      { name: '占晟画室', district: '南沙区' },
      { name: '姜浩张超画室', district: '佛山市' },
      { name: '天行健画室', district: '南沙区' },
      { name: '人艺画室', district: '海珠区' },
      { name: '创艺画室', district: '黄埔区' },
      { name: '更高画室', district: '海珠区' },
      { name: '寒阳画室', district: '海珠区' },
      { name: '正美术画室', district: '增城区' },
      { name: '艺巢画室', district: '增城区' },
      { name: '飞天画室', district: '黄埔区' },
      { name: '人人画室', district: '黄埔区' },
      { name: '达芬奇画室', district: '南沙区' },
      { name: '新锐画室', district: '增城区' },
      { name: '超艺画室', district: '南沙区' },
      { name: '战国画室', district: '南沙区' },
      { name: '清华园画室', district: '番禺区' },
      { name: '上善画室', district: '佛山市' },
      { name: '立青画室', district: '深圳市' },
    ],
  };

  // 先把已有 studios 读出来，避免重复插入
  const existingStudios = await db.collection('studios').get();
  const existingSet = new Set(existingStudios.data.map(s => `${s.name}||${s.city || ''}`));

  let studioCount = 0;
  for (const [city, studios] of Object.entries(allStudios)) {
    for (const s of studios) {
      const key = `${s.name}||${city}`;
      if (!existingSet.has(key)) {
        await db.collection('studios').add({
          data: { ...s, city, description: '', cover_url: '', createTime: db.serverDate() },
        });
        studioCount++;
      }
    }
  }
  results.studios_added = studioCount;

  // 2. 为没有 city 字段的旧 studio 补上 city（兼容旧数据）
  try {
    const noCity = await db.collection('studios').where({ city: db.command.exists(false) }).get();
    for (const s of noCity.data) {
      await db.collection('studios').doc(s._id).update({ data: { city: 'hangzhou' } });
    }
    results.studios_migrated = noCity.data.length;
  } catch (e) {
    results.studios_migrated = 'skipped (field may not exist yet)';
  }

  // 3. 去掉画室名里的"画室"/"学堂"等后缀，生成认证码
  const allStudioList = await db.collection('studios').get();
  results.total_studios = allStudioList.data.length;

  for (const s of allStudioList.data) {
    const existingCodes = await db.collection('verification_codes').where({ studio_id: s._id }).count();
    if (existingCodes.total > 0) continue; // 已有认证码，跳过
    const code = s.name + '2026';
    await db.collection('verification_codes').add({
      data: { code, studio_id: s._id, is_used: false, createTime: db.serverDate() },
    });
  }
  results.verification_codes = 'created for new studios';

  // 4. Verify collections exist
  const collections = ['users', 'posts', 'comments', 'likes', 'favorites', 'follows', 'conversations', 'messages', 'notifications'];
  for (const col of collections) {
    try {
      const c = await db.collection(col).count();
      results[col] = `ok (${c.total} docs)`;
    } catch (e) {
      results[col] = 'needs manual creation';
    }
  }

  return { code: 0, results };
};
