const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const res = await db.collection('notifications')
    .where({ user_id: openid })
    .orderBy('createTime', 'desc')
    .limit(50)
    .get();

  const unreadCount = res.data.filter((n) => !n.is_read).length;

  return { notifications: res.data, unread_count: unreadCount };
};
