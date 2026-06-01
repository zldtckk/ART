const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const MAX_LEN = 1000;

exports.main = async (event) => {
  const { conversationId, content } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!conversationId) return { code: -1, msg: '参数错误' };
  const text = (content || '').trim();
  if (!text) return { code: -1, msg: '消息不能为空' };
  if (text.length > MAX_LEN) return { code: -1, msg: '消息过长' };

  // 校验调用者是会话参与者，禁止往他人会话注入消息
  const convRes = await db.collection('conversations').doc(conversationId).get().catch(() => null);
  const conv = convRes && convRes.data;
  if (!conv || (conv.user1 !== openid && conv.user2 !== openid)) {
    return { code: -1, msg: '无权限' };
  }

  const msg = {
    conversation_id: conversationId,
    sender_id: openid,
    content: text,
    is_read: false,
    createTime: db.serverDate(),
  };
  const res = await db.collection('messages').add({ data: msg });

  // 更新会话最后消息
  await db.collection('conversations').doc(conversationId).update({
    data: {
      last_message: text,
      last_message_at: db.serverDate(),
    },
  });

  return { code: 0, message: { ...msg, _id: res._id } };
};
