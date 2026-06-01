const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const PUBLIC_FIELDS = ['_openid', 'nickname', 'avatar_url'];
function pickPublic(u) {
  const out = {};
  PUBLIC_FIELDS.forEach((k) => { if (u[k] !== undefined) out[k] = u[k]; });
  return out;
}

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;

  const convRes = await db.collection('conversations')
    .where(_.or([{ user1: openid }, { user2: openid }]))
    .orderBy('last_message_at', 'desc')
    .limit(100)
    .get();

  const conversations = convRes.data;
  if (conversations.length === 0) return { conversations: [] };

  // 批量取对方公开资料，避免 N+1
  const peerIds = [...new Set(conversations.map((c) => (c.user1 === openid ? c.user2 : c.user1)).filter(Boolean))];
  const usersRes = await db.collection('users').where({ _openid: _.in(peerIds) }).limit(100).get();
  const userMap = {};
  usersRes.data.forEach((u) => { userMap[u._openid] = pickPublic(u); });

  const enriched = conversations.map((c) => {
    const peerId = c.user1 === openid ? c.user2 : c.user1;
    const peer = userMap[peerId] || {};
    return { ...c, peer_id: peerId, peer_name: peer.nickname || '用户', peer_avatar: peer.avatar_url || '' };
  });

  return { conversations: enriched };
};
