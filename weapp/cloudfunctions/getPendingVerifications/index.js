const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admins').where({ openid }).count();
  return res.total > 0;
}

exports.main = async () => {
  if (!(await isAdmin(cloud.getWXContext().OPENID))) {
    return { code: -1, msg: '仅管理员可访问', users: [] };
  }

  const res = await db.collection('users')
    .where({ verification_status: 'pending' })
    .orderBy('createTime', 'desc')
    .limit(100)
    .get();

  return { code: 0, users: res.data };
};
