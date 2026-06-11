const db = wx.cloud.database();
const _ = db.command;
const { formatTime, displayName } = require('./formatter');
const { CITIES } = require('../config/city');

function getCurrentCity() {
  const app = getApp();
  return (app && app.globalData && app.globalData.currentCity) || CITIES[0].slug;
}

// ── Helpers ──

function mapDoc(doc) {
  if (!doc) return doc;
  return { id: doc._id, ...doc };
}

function mapDocs(docs) {
  return (docs || []).map(mapDoc);
}

// ── Enrichment (fetch user profiles for display) ──

// 通过云函数批量获取公开资料（users 集合已锁为仅创建者可读写，客户端无法读他人）
async function fetchUserMap(openids) {
  const unique = [...new Set((openids || []).filter(Boolean))];
  if (!unique.length) return {};
  const userMap = {};
  try {
    const res = await wx.cloud.callFunction({ name: 'getUserProfiles', data: { openids: unique } });
    (res.result && res.result.users || []).forEach(u => { userMap[u._openid] = u; });
  } catch (e) { /* 失败时回退为空，展示兜底名称 */ }
  return userMap;
}

async function enrichPosts(posts) {
  if (!posts || !posts.length) return posts;
  const openids = posts.map(p => p._openid);
  const userMap = await fetchUserMap(openids);
  return posts.map(p => {
    const author = userMap[p._openid] || {};
    return {
      ...p,
      display_name: displayName(author),
      display_avatar: author.avatar_url || '',
      user_id: p._openid,
      created_at: formatTime(p.createTime),
    };
  });
}

async function enrichComments(comments) {
  if (!comments || !comments.length) return comments;
  const userMap = await fetchUserMap(comments.map(c => c._openid));
  return comments.map(c => {
    const author = userMap[c._openid] || {};
    return {
      ...c,
      display_name: displayName(author),
      display_avatar: author.avatar_url || '',
      user_id: c._openid,
      created_at: formatTime(c.createTime),
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
  const res = await db.collection('studios').where({ city: getCurrentCity() }).get();
  return mapDocs(res.data);
}

// ── Posts ──

async function getPosts({ board, studio_id, circle_type, fan_type, market_category, market_tag, sort, page = 1, limit = 20 } = {}) {
  const conditions = {};
  if (board) conditions.board = board;
  else conditions.board = _.neq('gathering'); // 主信息流不显示攒局帖
  if (studio_id) conditions.studio_id = studio_id;
  if (circle_type && circle_type !== 'all') conditions.circle_type = circle_type;
  if (fan_type && fan_type !== 'all') conditions.fan_type = fan_type;
  if (market_category && market_category !== 'all') conditions.market_category = market_category;
  if (market_tag && market_tag !== 'all') conditions.market_tag = market_tag;

  conditions.city = getCurrentCity();

  let query = db.collection('posts').where(conditions);
  if (sort === 'hot') {
    query = query.orderBy('like_count', 'desc');
  } else {
    query = query.orderBy('createTime', 'desc');
  }
  query = query.skip((page - 1) * limit).limit(limit);

  const res = await query.get();
  const posts = mapDocs(res.data);
  const enriched = await enrichPosts(posts);

  const openid = getApp().globalData.user && getApp().globalData.user._openid;
  if (openid && enriched.length > 0) {
    try {
      const postIds = enriched.map(p => p._id);
      const [myLikes, myFavs] = await Promise.all([
        db.collection('likes').where({ post_id: _.in(postIds) }).get(),
        db.collection('favorites').where({ post_id: _.in(postIds) }).get(),
      ]);
      const likedSet = new Set(myLikes.data.map(l => l.post_id));
      const favSet = new Set(myFavs.data.map(f => f.post_id));
      return enriched.map(p => ({ ...p, is_liked: likedSet.has(p._id), is_favorited: favSet.has(p._id) }));
    } catch (e) {
      return enriched;
    }
  }
  return enriched;
}

async function getPost(id) {
  const res = await db.collection('posts').doc(id).get();
  const post = mapDoc(res.data);
  const enriched = await enrichPosts([post]);
  const p = enriched[0] || post;

  const openid = getApp().globalData.user && getApp().globalData.user._openid;
  if (openid) {
    try {
      const [likeRes, favRes] = await Promise.all([
        db.collection('likes').where({ post_id: id }).get(),
        db.collection('favorites').where({ post_id: id }).get(),
      ]);
      p.is_liked = likeRes.data.some(l => l._openid === openid);
      p.is_favorited = favRes.data.some(f => f._openid === openid);
    } catch (e) { /* 查询失败不影响帖子展示 */ }
  }
  return p;
}

async function createPost(data) {
  const res = await wx.cloud.callFunction({ name: 'createPost', data: { ...data, city: getCurrentCity() } });
  const result = res.result || {};
  if (result.code !== 0) throw new Error(result.msg || '发布失败');
  return mapDoc(result.post);
}

async function deletePost(id) {
  // 走云函数：校验作者/管理员，一次删净所有用户的关联数据
  const res = await wx.cloud.callFunction({ name: 'deletePost', data: { postId: id } });
  const result = res.result || {};
  if (result.code !== 0) throw new Error(result.msg || '删除失败');
  return result;
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
  // 走云函数：校验帖子存在、原子更新评论数、给作者发通知
  const res = await wx.cloud.callFunction({ name: 'addComment', data: { postId, content } });
  const result = res.result || {};
  if (result.code !== 0 || !result.comment) {
    throw new Error(result.msg || '评论失败');
  }
  const user = (getApp().globalData.user) || {};
  return mapDoc({
    ...result.comment,
    display_name: displayName(user),
    display_avatar: user.avatar_url || '',
  });
}

// ── Likes ──

async function toggleLike(postId) {
  const res = await wx.cloud.callFunction({ name: 'toggleLike', data: { postId } });
  return res.result;
}

// ── Favorites ──

async function toggleFavorite(postId) {
  const res = await wx.cloud.callFunction({ name: 'toggleFavorite', data: { postId } });
  return res.result;
}

// ── Users ──

async function getUserProfile(userId) {
  // 走云函数取公开资料（users 集合客户端只能读自己）
  const map = await fetchUserMap([userId]);
  const u = map[userId];
  return u ? mapDoc(u) : null;
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
  // 走云函数（含管理员校验，users 集合客户端只能读自己）
  const res = await wx.cloud.callFunction({ name: 'getPendingVerifications' });
  return mapDocs((res.result && res.result.users) || []);
}

async function approveVerification(userId) {
  const res = await wx.cloud.callFunction({ name: 'approveVerification', data: { userId } });
  return res.result;
}

async function rejectVerification(userId, reason) {
  const res = await wx.cloud.callFunction({ name: 'rejectVerification', data: { userId, reason } });
  return res.result;
}

// ── Admin ──

async function addStudio(name, district) {
  const res = await db.collection('studios').add({
    data: { name, district, city: getCurrentCity(), description: '', cover_url: '', createTime: db.serverDate() },
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

  // 去重：同一帖子多条收藏记录，保留首条，多余的标记待清理
  const seen = new Set();
  const dupIds = [];
  favRes.data.forEach(f => {
    if (seen.has(f.post_id)) dupIds.push(f._id);
    else seen.add(f.post_id);
  });

  const postIds = [...seen];
  const postsRes = await db.collection('posts').where({ _id: _.in(postIds) }).get();
  const posts = mapDocs(postsRes.data);
  const existingPostIds = new Set(posts.map(p => p._id));

  // 自愈：清理孤儿收藏（帖子已删除）+ 重复记录，使收藏数与实际一致
  const orphanIds = favRes.data.filter(f => !existingPostIds.has(f.post_id)).map(f => f._id);
  const toRemove = [...new Set([...dupIds, ...orphanIds])];
  if (toRemove.length) {
    Promise.all(toRemove.map(id => db.collection('favorites').doc(id).remove())).catch(() => {});
  }

  return enrichPosts(posts);
}

// ── Conversations & Messages (云函数，集合已锁为仅管理端可读写) ──

async function getConversationList() {
  const res = await wx.cloud.callFunction({ name: 'getConversationList' });
  return mapDocs((res.result && res.result.conversations) || []);
}

async function getConversationMessages(conversationId) {
  const res = await wx.cloud.callFunction({ name: 'getConversationMessages', data: { conversationId } });
  return mapDocs((res.result && res.result.messages) || []);
}

async function markConversationRead(conversationId) {
  await wx.cloud.callFunction({ name: 'markConversationRead', data: { conversationId } }).catch(() => {});
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

async function getUnreadCount() {
  const res = await wx.cloud.callFunction({ name: 'getUnreadCount' });
  return res.result || { notification_unread: 0, message_unread: 0, total_unread: 0 };
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
  const user = getApp().globalData.user;
  if (!user) return;
  await wx.cloud.callFunction({ name: 'markNotificationsRead' });
}

// ── Search ──

async function searchPosts(keyword, limit = 20) {
  if (!keyword || !keyword.trim()) return [];
  const reg = db.RegExp({ regexp: keyword.trim(), options: 'i' });
  const res = await db.collection('posts')
    .where({ content: reg, board: _.neq('gathering'), city: getCurrentCity() })
    .orderBy('createTime', 'desc')
    .limit(limit)
    .get();
  const posts = mapDocs(res.data).map(p => ({
    ...p,
    created_at: formatTime(p.createTime),
    display_name: p.display_name || null,
  }));
  return await enrichPosts(posts);
}

// ── Verification Code ──

async function verifyStudioCode(code) {
  const res = await wx.cloud.callFunction({
    name: 'verifyCode',
    data: { code },
  });
  return res.result;
}

// ── Gatherings ──

async function getJoinedGatherings() {
  const openid = getApp().globalData.user && getApp().globalData.user._openid;
  if (!openid) return [];
  const joinRes = await db.collection('gatherings').where({ _openid: openid }).orderBy('createTime', 'desc').get();
  if (!joinRes.data.length) return [];
  const postIds = joinRes.data.map(g => g.post_id);
  const postsRes = await db.collection('posts').where({ _id: _.in(postIds) }).get();
  const posts = mapDocs(postsRes.data);
  return enrichPosts(posts);
}

async function getGatherings({ type, page = 1, limit = 20 } = {}) {
  const conditions = { board: 'gathering', city: getCurrentCity() };
  if (type && type !== 'all') conditions.gather_type = type;
  const res = await db.collection('posts')
    .where(conditions)
    .orderBy('createTime', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();
  const posts = mapDocs(res.data);
  const enriched = await enrichPosts(posts);
  const openid = getApp().globalData.user && getApp().globalData.user._openid;
  if (openid && enriched.length) {
    const postIds = enriched.map(p => p._id);
    const joinRes = await db.collection('gatherings').where({ post_id: _.in(postIds), _openid: openid }).get().catch(() => ({ data: [] }));
    const joinedSet = new Set(joinRes.data.map(g => g.post_id));
    return enriched.map(p => ({ ...p, is_joined: joinedSet.has(p._id) }));
  }
  return enriched;
}

async function joinGathering(postId) {
  const res = await wx.cloud.callFunction({ name: 'joinGathering', data: { postId } });
  const result = res.result || {};
  if (result.code !== 0) throw new Error(result.msg || '操作失败');
  return result;
}

async function uploadQrCode(filePath) {
  const cloudPath = `qrcodes/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const res = await wx.cloud.uploadFile({ cloudPath, filePath });
  return res.fileID;
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
  getUnreadCount,
  markNotificationsRead,
  deleteNotification,
  deleteConversation,
  searchPosts,
  verifyStudioCode,
  uploadImage,
  uploadImages,
  getGatherings,
  getJoinedGatherings,
  joinGathering,
  uploadQrCode,
  db,
  _,
};
