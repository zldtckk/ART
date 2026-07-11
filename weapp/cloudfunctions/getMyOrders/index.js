const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  const res = await db.collection('sam_orders')
    .where({ _openid: openid })
    .orderBy('createTime', 'desc')
    .limit(100)
    .get();
  return { code: 0, orders: res.data };
};
