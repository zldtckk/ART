const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { conversationId } = event;
  const openid = cloud.getWXContext().OPENID;
  if (!conversationId) return { code: -1, msg: '参数错误' };
  try {
    const res = await db.collection('conversations').doc(conversationId).get();
    const conv = res.data;
    if (!conv || (conv.user1 !== openid && conv.user2 !== openid)) {
      return { code: -1, msg: '无权限' };
    }
    await db.collection('messages').where({ conversation_id: conversationId }).remove();
    await db.collection('conversations').doc(conversationId).remove();
    return { code: 0 };
  } catch (e) {
    return { code: -1, msg: e.message };
  }
};
