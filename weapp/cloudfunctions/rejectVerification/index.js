const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admins').where({ openid }).count();
  return res.total > 0;
}

exports.main = async (event) => {
  const { userId, reason } = event;
  if (!userId) return { code: -1, msg: '参数错误' };

  // 校验调用者是管理员（admins 集合客户端不可写，无法伪造）
  if (!(await isAdmin(cloud.getWXContext().OPENID))) return { code: -1, msg: '仅管理员可操作' };

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
