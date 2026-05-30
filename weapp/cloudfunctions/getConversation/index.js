const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { peerId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 确保 user1 < user2 排序，唯一标识会话
  const users = [openid, peerId].sort();
  const user1 = users[0];
  const user2 = users[1];

  const existing = await db.collection('conversations')
    .where({ user1, user2 })
    .get();

  if (existing.data.length > 0) {
    return { conversation: existing.data[0] };
  }

  const conv = {
    user1,
    user2,
    last_message: '',
    last_message_at: db.serverDate(),
    createTime: db.serverDate(),
  };
  const res = await db.collection('conversations').add({ data: conv });
  return { conversation: { ...conv, _id: res._id } };
};
