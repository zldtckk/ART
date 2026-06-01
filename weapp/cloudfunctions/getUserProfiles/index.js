const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 公开字段白名单——绝不返回 student_id_url / real_name / phone 等隐私字段
const PUBLIC_FIELDS = ['_openid', 'nickname', 'avatar_url', 'studio_id', 'class_name', 'is_verified', 'verification_status', 'role'];

function pickPublic(u) {
  const out = {};
  PUBLIC_FIELDS.forEach((k) => { if (u[k] !== undefined) out[k] = u[k]; });
  return out;
}

exports.main = async (event) => {
  const { openids } = event;
  if (!Array.isArray(openids) || openids.length === 0) return { users: [] };

  const unique = [...new Set(openids.filter(Boolean))];
  // 云函数 .get() 单次上限 100 条，分批查询
  const chunks = [];
  for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));

  const results = await Promise.all(
    chunks.map((c) => db.collection('users').where({ _openid: _.in(c) }).limit(100).get())
  );
  const users = results.flatMap((r) => r.data.map(pickPublic));
  return { users };
};
