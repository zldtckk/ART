const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { notificationId } = event;
  const openid = cloud.getWXContext().OPENID;
  if (!notificationId) return { code: -1, msg: '参数错误' };
  try {
    // 校验通知属于调用者本人
    const res = await db.collection('notifications').doc(notificationId).get();
    if (!res.data || res.data.user_id !== openid) return { code: -1, msg: '无权限' };

    await db.collection('notifications').doc(notificationId).remove();
    return { code: 0 };
  } catch (e) {
    return { code: -1, msg: e.message };
  }
};
