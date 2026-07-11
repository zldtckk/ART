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
  const { id } = event;
  if (!id) return { code: -1, msg: '参数错误' };

  const res = await db.collection('sam_orders').doc(id).get().catch(() => null);
  const order = res && res.data;
  if (!order) return { code: -1, msg: '订单不存在' };

  if (order._openid !== openid && !(await isAdmin(openid))) {
    return { code: -1, msg: '无权查看该订单' };
  }

  return { code: 0, order };
};
