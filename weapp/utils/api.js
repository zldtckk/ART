const db = wx.cloud.database();
const _ = db.command;

// ── Helpers ──

function mapDoc(doc) {
  if (!doc) return doc;
  return { id: doc._id, ...doc };
}

function mapDocs(docs) {
  return (docs || []).map(mapDoc);
}

// ── Enrichment (fetch user profiles for display) ──

async function enrichPosts(posts) {
  if (!posts || !posts.length) return posts;
  const openids = [...new Set(posts.filter(p => !p.is_anonymous).map(p => p._openid).filter(Boolean))];
  const userMap = {};
  if (openids.length) {
    const usersRes = await db.collection('users').where({ _openid: _.in(openids) }).get();
    usersRes.data.forEach(u => { userMap[u._openid] = u; });
  }
  return posts.map(p => {
    const author = userMap[p._openid] || {};
    return {
      ...p,
      display_name: p.is_anonymous ? '匿名用户' : (author.nickname || '未知用户'),
      display_avatar: p.is_anonymous ? '' : (author.avatar_url || ''),
      user_id: p._openid,
    };
  });
}

async function enrichComments(comments) {
  if (!comments || !comments.length) return comments;
  const openids = [...new Set(comments.map(c => c._openid).filter(Boolean))];
  if (!openids.length) return comments;
  const usersRes = await db.collection('users').where({ _openid: _.in(openids) }).get();
  const userMap = {};
  usersRes.data.forEach(u => { userMap[u._openid] = u; });
  return comments.map(c => {
    const author = userMap[c._openid] || {};
    return {
      ...c,
      display_name: author.nickname || '用户',
      display_avatar: author.avatar_url || '',
    };
  });
}

// ── Auth ──

async function login() {
  const res = await wx.cloud.callFunction({ name: 'login' });
  return res.result;
}

// ── Studios ──

async function getStudios() {
  const res = await db.collection('studios').get();
  return mapDocs(res.data);
}

// ── Posts ──

async function getPosts({ board, studio_id, circle_type, market_category, market_tag, sort, page = 1, limit = 20 } = {}) {
  const conditions = {};
  if (board) conditions.board = board;
  if (studio_id) conditions.studio_id = studio_id;
  if (circle_type && circle_type !== 'all') conditions.circle_type = circle_type;
  if (market_category && market_category !== 'all') conditions.market_category = market_category;
  if (market_tag && market_tag !== 'all') conditions.market_tag = market_tag;

  let query = db.collection('posts').where(conditions);
  if (sort === 'hot') {
    query = query.orderBy('like_count', 'desc').orderBy('comment_count', 'desc');
  }
  query = query.orderBy('createTime', 'desc').skip((page - 1) * limit).limit(limit);

  const res = await query.get();
  const posts = mapDocs(res.data);
  return enrichPosts(posts);
}

async function getPost(id) {
  const res = await db.collection('posts').doc(id).get();
  const post = mapDoc(res.data);
  const enriched = await enrichPosts([post]);
  return enriched[0] || post;
}

async function createPost(data) {
  const app = getApp();
  const user = app.globalData.user;
  const doc = {
    ...data,
    images: data.images || [],
    is_anonymous: !!data.is_anonymous,
    is_public: data.is_public !== undefined ? !!data.is_public : true,
    like_count: 0,
    comment_count: 0,
    favorite_count: 0,
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
  };
  if (user && user.studio_id) doc.studio_id = user.studio_id;
  const res = await db.collection('posts').add({ data: doc });
  return mapDoc({ ...doc, _id: res._id });
}

async function deletePost(id) {
  await db.collection('posts').doc(id).remove();
  await db.collection('comments').where({ post_id: id }).remove();
  await db.collection('likes').where({ post_id: id }).remove();
  await db.collection('favorites').where({ post_id: id }).remove();
}

// ── Comments ──

async function getComments(postId) {
  const res = await db.collection('comments')
    .where({ post_id: postId })
    .orderBy('createTime', 'asc')
    .get();
  const comments = mapDocs(res.data);
  return enrichComments(comments);
}

async function addComment(postId, content) {
  const data = {
    post_id: postId,
    content,
    createTime: db.serverDate(),
  };
  const res = await db.collection('comments').add({ data });
  await db.collection('posts').doc(postId).update({
    data: { comment_count: _.inc(1) },
  });
  const user = (getApp().globalData.user) || {};
  return mapDoc({
    ...data,
    _id: res._id,
    display_name: user.nickname || '用户',
    display_avatar: user.avatar_url || '',
  });
}

// ── Likes ──

async function toggleLike(postId) {
  const openid = getApp().globalData.user._openid;
  if (!openid) return { liked: false };

  const existing = await db.collection('likes')
    .where({ post_id: postId, _openid: openid })
    .get();

  if (existing.data.length > 0) {
    await db.collection('likes').doc(existing.data[0]._id).remove();
    await db.collection('posts').doc(postId).update({
      data: { like_count: _.inc(-1) },
    });
    return { liked: false };
  }
  await db.collection('likes').add({
    data: { post_id: postId, createTime: db.serverDate() },
  });
  await db.collection('posts').doc(postId).update({
    data: { like_count: _.inc(1) },
  });
  return { liked: true };
}

// ── Favorites ──

async function toggleFavorite(postId) {
  const openid = getApp().globalData.user._openid;
  if (!openid) return { favorited: false };

  const existing = await db.collection('favorites')
    .where({ post_id: postId, _openid: openid })
    .get();

  if (existing.data.length > 0) {
    // Remove all matching records (clean up duplicates)
    const tasks = existing.data.map(d => db.collection('favorites').doc(d._id).remove());
    await Promise.all(tasks);
    await db.collection('posts').doc(postId).update({
      data: { favorite_count: _.inc(-existing.data.length) },
    });
    return { favorited: false };
  }
  await db.collection('favorites').add({
    data: { post_id: postId, createTime: db.serverDate() },
  });
  await db.collection('posts').doc(postId).update({
    data: { favorite_count: _.inc(1) },
  });
  return { favorited: true };
}

// ── Users ──

async function getUserProfile(userId) {
  const res = await db.collection('users').where({ _openid: userId }).get();
  return mapDoc(res.data[0]);
}

async function getMyProfile() {
  const openid = getApp().globalData.user._openid;
  if (!openid) return null;
  const res = await db.collection('users').where({ _openid: openid }).get();
  return mapDoc(res.data[0]);
}

async function updateUser(data) {
  const openid = getApp().globalData.user._openid;
  if (!openid) return null;
  const res = await db.collection('users').where({
    _openid: openid,
  }).update({ data });
  return res;
}

async function getUserStats() {
  const res = await wx.cloud.callFunction({ name: 'getUserStats' });
  return res.result;
}

async function submitVerification(data) {
  const openid = getApp().globalData.user._openid;
  if (!openid) return null;
  const res = await db.collection('users').where({
    _openid: openid,
  }).update({
    data: {
      real_name: data.real_name,
      student_id_url: data.student_id_url,
      studio_id: data.studio_id,
      class_name: data.class_name,
      verification_status: 'pending',
      verification_method: data.method,
    },
  });
  return res;
}

async function getPendingVerifications() {
  const res = await db.collection('users')
    .where({ verification_status: 'pending' })
    .orderBy('createTime', 'desc')
    .get();
  return mapDocs(res.data);
}

async function approveVerification(userId) {
  await db.collection('users').doc(userId).update({
    data: { verification_status: 'approved', is_verified: true },
  });
  await db.collection('notifications').add({
    data: {
      user_id: userId,
      type: 'verify_result',
      title: '认证通过',
      content: '恭喜，你的画室认证已通过！',
      is_read: false,
      createTime: db.serverDate(),
    },
  });
}

async function rejectVerification(userId) {
  await db.collection('users').doc(userId).update({
    data: { verification_status: 'rejected' },
  });
}

// ── Admin ──

async function becomeAdmin() {
  const openid = getApp().globalData.user._openid;
  if (!openid) return null;
  await db.collection('users').where({ _openid: openid }).update({
    data: { role: 'circle_master' },
  });
  return getMyProfile();
}

async function addStudio(name, district) {
  const res = await db.collection('studios').add({
    data: { name, district, description: '', cover_url: '', createTime: db.serverDate() },
  });
  return mapDoc({ _id: res._id, name, district });
}

// ── My Content ──

async function getMyPosts({ page = 1, limit = 20 } = {}) {
  const user = (getApp().globalData.user) || {};
  const openid = user._openid;
  if (!openid) return [];
  const res = await db.collection('posts')
    .where({ _openid: openid })
    .orderBy('createTime', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();
  const posts = mapDocs(res.data);
  return enrichPosts(posts);
}

async function getMyComments({ page = 1, limit = 20 } = {}) {
  const user = (getApp().globalData.user) || {};
  const openid = user._openid;
  if (!openid) return [];
  const res = await db.collection('comments')
    .where({ _openid: openid })
    .orderBy('createTime', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  if (!res.data.length) return [];

  const postIds = [...new Set(res.data.map(c => c.post_id))];
  const postsRes = await db.collection('posts').where({ _id: _.in(postIds) }).get();
  const postMap = {};
  postsRes.data.forEach(p => { postMap[p._id] = p; });

  return mapDocs(res.data).map(c => ({
    ...c,
    post_content: (postMap[c.post_id] && postMap[c.post_id].content) || '',
  }));
}

async function getMyFavorites({ page = 1, limit = 20 } = {}) {
  const user = (getApp().globalData.user) || {};
  const openid = user._openid;
  if (!openid) return [];
  const favRes = await db.collection('favorites')
    .where({ _openid: openid })
    .orderBy('createTime', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  if (!favRes.data.length) return [];

  const postIds = [...new Set(favRes.data.map(f => f.post_id))];
  const postsRes = await db.collection('posts').where({ _id: _.in(postIds) }).get();
  const posts = mapDocs(postsRes.data);
  return enrichPosts(posts);
}

// ── Conversations & Messages (client-side queries) ──

async function getConversationList() {
  const openid = getApp().globalData.user._openid;
  if (!openid) return [];
  const res = await db.collection('conversations')
    .where(_.or([{ user1: openid }, { user2: openid }]))
    .orderBy('last_message_at', 'desc')
    .get();
  return mapDocs(res.data);
}

async function getConversationMessages(conversationId) {
  const res = await db.collection('messages')
    .where({ conversation_id: conversationId })
    .orderBy('createTime', 'asc')
    .get();
  return mapDocs(res.data);
}

async function markConversationRead(conversationId) {
  const openid = getApp().globalData.user._openid;
  if (!openid) return;
  await db.collection('messages')
    .where({ conversation_id: conversationId, sender_id: _.neq(openid), is_read: false })
    .update({ data: { is_read: true } });
}

// ── Messages (cloud functions) ──

async function getConversation(peerId) {
  const res = await wx.cloud.callFunction({
    name: 'getConversation',
    data: { peerId },
  });
  return res.result;
}

async function sendMessage(conversationId, content) {
  const res = await wx.cloud.callFunction({
    name: 'sendMessage',
    data: { conversationId, content },
  });
  return res.result;
}

async function getNotifications() {
  const res = await wx.cloud.callFunction({ name: 'getNotifications' });
  return res.result;
}

async function deleteNotification(notificationId) {
  const res = await wx.cloud.callFunction({ name: 'deleteNotification', data: { notificationId } });
  return res.result;
}

async function deleteConversation(conversationId) {
  const res = await wx.cloud.callFunction({ name: 'deleteConversation', data: { conversationId } });
  return res.result;
}

async function markNotificationsRead() {
  const openid = getApp().globalData.user._openid;
  if (!openid) return;
  await db.collection('notifications')
    .where({ user_id: openid, is_read: false })
    .update({ data: { is_read: true } });
}

// ── Verification Code ──

async function verifyStudioCode(code) {
  const res = await wx.cloud.callFunction({
    name: 'verifyCode',
    data: { code },
  });
  return res.result;
}

// ── Image Upload ──

async function uploadImage(filePath) {
  const { compressImage } = require('./compress');
  const compressed = await compressImage(filePath);
  const cloudPath = `images/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const res = await wx.cloud.uploadFile({ cloudPath, filePath: compressed });
  return res.fileID;
}

async function uploadImages(filePaths) {
  const tasks = filePaths.map(uploadImage);
  return Promise.all(tasks);
}

module.exports = {
  login,
  getStudios,
  getPosts,
  getPost,
  createPost,
  deletePost,
  getComments,
  addComment,
  toggleLike,
  toggleFavorite,
  getUserProfile,
  getMyProfile,
  updateUser,
  getUserStats,
  submitVerification,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  becomeAdmin,
  addStudio,
  getMyPosts,
  getMyComments,
  getMyFavorites,
  getConversationList,
  getConversationMessages,
  markConversationRead,
  getConversation,
  sendMessage,
  getNotifications,
  markNotificationsRead,
  deleteNotification,
  deleteConversation,
  verifyStudioCode,
  uploadImage,
  uploadImages,
  db,
  _,
};
