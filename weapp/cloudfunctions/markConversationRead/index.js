const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { conversationId } = event;
  const openid = cloud.getWXContext().OPENID;
  if (!conversationId) return { code: -1, msg: '参数错误' };

  // 校验参与者
  const convRes = await db.collection('conversations').doc(conversationId).get().catch(() => null);
  const conv = convRes && convRes.data;
  if (!conv || (conv.user1 !== openid && conv.user2 !== openid)) {
    return { code: -1, msg: '无权限' };
  }

  // 把对方发给我的、未读的消息标记为已读（云函数有管理员写权限）
  await db.collection('messages')
    .where({ conversation_id: conversationId, sender_id: _.neq(openid), is_read: false })
    .update({ data: { is_read: true } });

  return { code: 0 };
};
