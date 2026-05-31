const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { userId, reason } = event;
  if (!userId) return { code: -1, msg: '参数错误' };

  const userDoc = await db.collection('users').doc(userId).get();
  const openid = userDoc.data && userDoc.data._openid;

  await db.collection('users').doc(userId).update({
    data: { verification_status: 'rejected', rejection_reason: reason || '' },
  });

  if (openid) {
    await db.collection('notifications').add({
      data: {
        user_id: openid,
        type: 'verify_result',
        title: '认证未通过',
        content: reason ? `原因：${reason}` : '你的认证申请未通过，请修改后重新提交。',
        is_read: false,
        createTime: db.serverDate(),
      },
    });
  }

  return { code: 0 };
};
