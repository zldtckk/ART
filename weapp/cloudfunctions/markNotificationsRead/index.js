const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  await db.collection('notifications')
    .where({ user_id: openid, is_read: false })
    .update({ data: { is_read: true } });
  return { code: 0 };
};
