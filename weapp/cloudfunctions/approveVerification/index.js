const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { userId } = event;
  if (!userId) return { code: -1, msg: '参数错误' };

  const userDoc = await db.collection('users').doc(userId).get();
  const openid = userDoc.data && userDoc.data._openid;

  await db.collection('users').doc(userId).update({
    data: { verification_status: 'approved', is_verified: true },
  });

  if (openid) {
    await db.collection('notifications').add({
      data: {
        user_id: openid,
        type: 'verify_result',
        title: '认证通过 🎉',
        content: '恭喜，你的画室认证已通过，现在可以发帖、评论和私信了！',
        is_read: false,
        createTime: db.serverDate(),
      },
    });
  }

  return { code: 0 };
};
