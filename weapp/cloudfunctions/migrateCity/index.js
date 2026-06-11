const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const _ = db.command;
  const results = {};

  // 1. 画室 migration：补 city
  try {
    const noCity = await db.collection('studios').where({ city: _.exists(false) }).get();
    results.studios_found = noCity.data.length;
    for (const s of noCity.data) {
      await db.collection('studios').doc(s._id).update({ data: { city: 'hangzhou' } });
    }
    results.studios_migrated = noCity.data.length;
  } catch (e) {
    results.studios_error = e.message;
  }

  // 2. 帖子 migration：补 city
  try {
    const noCityPosts = await db.collection('posts').where({ city: _.exists(false) }).get();
    results.posts_found = noCityPosts.data.length;
    for (const p of noCityPosts.data) {
      await db.collection('posts').doc(p._id).update({ data: { city: 'hangzhou' } });
    }
    results.posts_migrated = noCityPosts.data.length;
  } catch (e) {
    results.posts_error = e.message;
  }

  // 3. 创建广州画室（如果还没有的话）
  const gzStudios = [
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
  ];

  const existingStudios = await db.collection('studios').where({ city: 'guangzhou' }).get();
  const existingNames = new Set(existingStudios.data.map(s => s.name));
  let added = 0;
  for (const s of gzStudios) {
    if (!existingNames.has(s.name)) {
      await db.collection('studios').add({
        data: { ...s, city: 'guangzhou', description: '', cover_url: '', createTime: db.serverDate() },
      });
      added++;
    }
  }
  results.gz_studios_added = added;

  // 4. 给新画室生成认证码
  const allStudios = await db.collection('studios').get();
  let codeAdded = 0;
  for (const s of allStudios.data) {
    const existingCodes = await db.collection('verification_codes').where({ studio_id: s._id }).count();
    if (existingCodes.total > 0) continue;
    await db.collection('verification_codes').add({
      data: { code: s.name + '2026', studio_id: s._id, is_used: false, createTime: db.serverDate() },
    });
    codeAdded++;
  }
  results.verification_codes_added = codeAdded;

  return { code: 0, results };
};
