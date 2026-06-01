const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { conversationId } = event;
  const openid = cloud.getWXContext().OPENID;
  if (!conversationId) return { code: -1, msg: '参数错误', messages: [] };

  // 校验调用者是会话参与者
  const convRes = await db.collection('conversations').doc(conversationId).get().catch(() => null);
  const conv = convRes && convRes.data;
  if (!conv || (conv.user1 !== openid && conv.user2 !== openid)) {
    return { code: -1, msg: '无权限', messages: [] };
  }

  const res = await db.collection('messages')
    .where({ conversation_id: conversationId })
    .orderBy('createTime', 'asc')
    .limit(200)
    .get();

  return { code: 0, messages: res.data };
};
