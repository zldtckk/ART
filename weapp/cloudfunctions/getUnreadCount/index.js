const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;

  // 未读通知数
  const notifRes = await db.collection('notifications')
    .where({ user_id: openid, is_read: false })
    .count();
  const notificationUnread = notifRes.total || 0;

  // 未读私信数：对方发给我的、尚未已读的消息
  const convRes = await db.collection('conversations')
    .where(_.or([{ user1: openid }, { user2: openid }]))
    .get();

  let messageUnread = 0;
  if (convRes.data.length > 0) {
    const convIds = convRes.data.map(c => c._id);
    const msgRes = await db.collection('messages')
      .where({
        conversation_id: _.in(convIds),
        sender_id: _.neq(openid),
        is_read: false,
      })
      .count();
    messageUnread = msgRes.total || 0;
  }

  return {
    notification_unread: notificationUnread,
    message_unread: messageUnread,
    total_unread: notificationUnread + messageUnread,
  };
};
