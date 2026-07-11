const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admins').where({ openid }).count();
  return res.total > 0;
}

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  if (!(await isAdmin(openid))) return { code: -1, msg: '仅管理员可查看', orders: [] };

  let query = db.collection('sam_orders');
  if (event.status) query = query.where({ status: event.status });

  const res = await query.orderBy('createTime', 'desc').limit(200).get();
  return { code: 0, orders: res.data };
};
