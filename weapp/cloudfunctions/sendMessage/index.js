const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { conversationId, content } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!content) return { code: -1, msg: '消息不能为空' };

  const msg = {
    conversation_id: conversationId,
    sender_id: openid,
    content,
    is_read: false,
    createTime: db.serverDate(),
  };
  await db.collection('messages').add({ data: msg });

  // 更新会话最后消息
  await db.collection('conversations').doc(conversationId).update({
    data: {
      last_message: content,
      last_message_at: db.serverDate(),
    },
  });

  return { code: 0, message: msg };
};
