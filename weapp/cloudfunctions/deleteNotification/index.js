const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { notificationId } = event;
  if (!notificationId) return { code: -1, msg: '参数错误' };
  try {
    await db.collection('notifications').doc(notificationId).remove();
    return { code: 0 };
  } catch (e) {
    return { code: -1, msg: e.message };
  }
};
