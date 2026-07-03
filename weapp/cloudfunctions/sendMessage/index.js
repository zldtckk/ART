const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const MAX_LEN = 1000;

async function checkText(content, openid) {
  try {
    const res = await cloud.openapi.security.msgSecCheck({ content, version: 2, scene: 1, openid });
    return res.result && res.result.suggest === 'risky';
  } catch (e) {
    return false;
  }
}

exports.main = async (event) => {
  const { conversationId, content, type, image_url } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!conversationId) return { code: -1, msg: '参数错误' };

  const text = (content || '').trim();
  const msgType = type || 'text';

  // 纯图片或无文字时跳过文本校验
  if (!text && msgType === 'image') {
    if (!image_url) return { code: -1, msg: '请选择图片' };
  } else if (!text && msgType !== 'image') {
    return { code: -1, msg: '消息不能为空' };
  }

  if (text && text.length > MAX_LEN) return { code: -1, msg: '消息过长' };
  if (text && (await checkText(text, openid))) return { code: -1, msg: '消息内容违规，请修改后重试' };

  // 校验调用者是会话参与者
  const convRes = await db.collection('conversations').doc(conversationId).get().catch(() => null);
  const conv = convRes && convRes.data;
  if (!conv || (conv.user1 !== openid && conv.user2 !== openid)) {
    return { code: -1, msg: '无权限' };
  }

  const msg = {
    conversation_id: conversationId,
    sender_id: openid,
    content: text,
    type: msgType,
    is_read: false,
    createTime: db.serverDate(),
  };
  if (image_url) msg.image_url = image_url;

  const res = await db.collection('messages').add({ data: msg });

  // 更新会话最后消息预览
  let lastMessage = text;
  if (msgType === 'image') {
    lastMessage = text ? text : '[图片]';
  }
  if (text && msgType === 'image') {
    lastMessage = text + ' [图片]';
  }

  await db.collection('conversations').doc(conversationId).update({
    data: {
      last_message: lastMessage,
      last_message_at: db.serverDate(),
    },
  });

  return { code: 0, message: { ...msg, _id: res._id } };
};
