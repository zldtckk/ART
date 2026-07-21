const request = require('./request');
const { formatTime, displayName } = require('./formatter');
const { CITIES } = require('../config/city');

function getCurrentCity() {
  const app = getApp();
  return (app && app.globalData && app.globalData.currentCity) || CITIES[0].slug;
}

// ── Helpers ──
// 新后端返回 id/openid/created_at，这里补回 _id/_openid/createTime，
// 让页面层（大量用 post._id、post._openid、post.createTime）基本不用改，
// created_at 覆盖成格式化后的展示字符串，和原来客户端 enrichPosts 的行为一致
function mapDoc(doc) {
  if (!doc) return doc;
  const out = { ...doc };
  if (doc.id !== undefined) out._id = doc.id;
  // 原客户端 enrichPosts/enrichComments 会把作者 openid 额外存一份到 user_id 字段
  // （用于头像点击跳转等），这里补回来，否则 data-uid="{{post.user_id}}" 会是空的点了没反应
  if (doc.openid !== undefined) { out._openid = doc.openid; out.user_id = doc.openid; }
  if (doc.created_at !== undefined) {
    out.createTime = doc.created_at;
    out.created_at = formatTime(doc.created_at);
  }
  if (doc.updated_at !== undefined) out.updateTime = doc.updated_at;
  return out;
}
function mapDocs(docs) {
  return (docs || []).map(mapDoc);
}

// ── Studios ──

async function getStudios() {
  const res = await request.get('/studios', { city: getCurrentCity() }).catch(() => ({ studios: [] }));
  return mapDocs(res.studios);
}

async function getAllStudios() {
  const res = await request.get('/studios').catch(() => ({ studios: [] }));
  return mapDocs(res.studios);
}

// ── Posts ──

async function getPosts({ board, studio_id, circle_type, fan_type, market_category, market_tag, sort, page = 1, limit = 20 } = {}) {
  const res = await request.get('/posts', {
    board, studio_id, circle_type, fan_type, market_category, market_tag, sort, page, limit,
    city: getCurrentCity(),
  });
  return mapDocs(res.posts);
}

async function getPost(id) {
  const res = await request.get(`/posts/${id}`);
  return mapDoc(res.post);
}

async function createPost(data) {
  const res = await request.post('/posts', { ...data, city: getCurrentCity() });
  return mapDoc(res.post);
}

async function deletePost(id) {
  return request.del(`/posts/${id}`);
}

// ── Comments ──

async function getComments(postId) {
  const res = await request.get(`/posts/${postId}/comments`);
  return mapDocs(res.comments);
}

async function addComment(postId, content, opts = {}) {
  const res = await request.post(`/posts/${postId}/comments`, {
    content,
    parent_comment_id: opts.parentCommentId || undefined,
    reply_to_user_id: opts.replyToUserId || undefined,
  });
  return mapDoc(res.comment);
}

// ── Likes / Favorites ──

async function toggleLike(postId) {
  return request.post(`/posts/${postId}/like`);
}

async function toggleFavorite(postId) {
  return request.post(`/posts/${postId}/favorite`);
}

// ── Users ──

async function getUserProfile(userId) {
  try {
    const res = await request.get(`/users/${userId}`);
    return mapDoc(res.user);
  } catch (e) {
    return null;
  }
}

async function getUserPosts(userId, { page = 1, limit = 20 } = {}) {
  const res = await request.get(`/users/${userId}/posts`, { page, limit }).catch(() => ({ posts: [] }));
  return mapDocs(res.posts);
}

async function getMyProfile() {
  const res = await request.get('/me/profile').catch(() => null);
  return res ? mapDoc(res.user) : null;
}

async function updateUser(data) {
  return request.patch('/me/profile', data);
}

async function getUserStats() {
  return request.get('/me/stats');
}

async function submitVerification(data) {
  return request.post('/me/verification', data);
}

async function incrementViewCount(postId) {
  request.post(`/posts/${postId}/view`).catch(() => {});
}

async function getPendingVerifications() {
  const res = await request.get('/admin/verifications/pending').catch(() => ({ users: [] }));
  return mapDocs(res.users);
}

async function approveVerification(userId) {
  return request.post(`/admin/verifications/${userId}/approve`);
}

async function rejectVerification(userId, reason) {
  return request.post(`/admin/verifications/${userId}/reject`, { reason });
}

// ── Admin ──

async function addStudio(name, district) {
  const res = await request.post('/admin/studios', { name, district, city: getCurrentCity() });
  return mapDoc(res.studio);
}

// ── My Content ──

async function getMyPosts({ page = 1, limit = 20 } = {}) {
  const res = await request.get('/me/posts', { page, limit }).catch(() => ({ posts: [] }));
  return mapDocs(res.posts);
}

async function getMyComments({ page = 1, limit = 20 } = {}) {
  const res = await request.get('/me/comments', { page, limit }).catch(() => ({ comments: [] }));
  return mapDocs(res.comments);
}

async function getMyFavorites({ page = 1, limit = 20 } = {}) {
  const res = await request.get('/me/favorites', { page, limit }).catch(() => ({ posts: [] }));
  return mapDocs(res.posts);
}

// ── Conversations & Messages ──

async function getConversationList() {
  const res = await request.get('/conversations').catch(() => ({ conversations: [] }));
  return mapDocs(res.conversations);
}

async function getConversationMessages(conversationId) {
  const res = await request.get(`/conversations/${conversationId}/messages`).catch(() => ({ messages: [] }));
  return mapDocs(res.messages);
}

async function markConversationRead(conversationId) {
  await request.post(`/conversations/${conversationId}/read`).catch(() => {});
}

async function getConversation(peerId) {
  const res = await request.post('/conversations', { peerId });
  return { conversation: mapDoc(res.conversation) };
}

async function sendMessage(conversationId, content, extra = {}) {
  const res = await request.post(`/conversations/${conversationId}/messages`, { content, ...extra });
  return { ...res, message: mapDoc(res.message) };
}

async function getNotifications() {
  const res = await request.get('/notifications');
  return { ...res, notifications: mapDocs(res.notifications) };
}

async function getUnreadCount() {
  return request.get('/me/unread-count').catch(() => ({ notification_unread: 0, message_unread: 0, total_unread: 0 }));
}

async function deleteNotification(notificationId) {
  return request.del(`/notifications/${notificationId}`);
}

async function deleteConversation(conversationId) {
  return request.del(`/conversations/${conversationId}`);
}

async function markNotificationsRead() {
  const user = getApp().globalData.user;
  if (!user) return;
  await request.post('/notifications/read').catch(() => {});
}

// ── Search ──

async function searchPosts(keyword, limit = 20) {
  if (!keyword || !keyword.trim()) return [];
  const res = await request.get('/posts/search', { q: keyword.trim(), limit, city: getCurrentCity() }).catch(() => ({ posts: [] }));
  return mapDocs(res.posts);
}

// ── Verification Code ──

async function verifyStudioCode(code) {
  return request.post('/verify/code', { code });
}

// ── Gatherings ──

async function getJoinedGatherings() {
  const res = await request.get('/me/gatherings').catch(() => ({ posts: [] }));
  return mapDocs(res.posts);
}

async function getGatherings({ type, page = 1, limit = 20 } = {}) {
  const res = await request.get('/gatherings', { type, page, limit, city: getCurrentCity() }).catch(() => ({ posts: [] }));
  return mapDocs(res.posts);
}

async function joinGathering(postId) {
  const result = await request.post(`/posts/${postId}/join`);
  return result;
}

async function setGatherQr(postId, url) {
  return request.patch(`/posts/${postId}/gather-qr`, { gather_qr: url });
}

// ── Image Upload ──

async function uploadQrCode(filePath) {
  const res = await request.uploadFile('/upload/qrcode', filePath);
  return res.url;
}

async function uploadImage(filePath) {
  const { compressImage } = require('./compress');
  const compressed = await compressImage(filePath);
  const res = await request.uploadFile('/upload/image', compressed);
  return res.url;
}

async function uploadImages(filePaths) {
  const tasks = filePaths.map(uploadImage);
  return Promise.all(tasks);
}

// ── AI素描测分 ──

async function getScoreQuota() {
  const res = await request.get('/score/quota').catch(() => ({ used: 0, limit: 50, remaining: 50 }));
  return res;
}

async function submitScore(imageUrl, foundation, monthsLeft, province, prevScore = null) {
  const res = await request.post('/score', { imageUrl, foundation, monthsLeft, province, prevScore });
  return res;
}

async function getScoreHistory() {
  const res = await request.get('/score/history').catch(() => ({ scores: [] }));
  return mapDocs(res.scores);
}

// ── 山姆代购 ──

async function getDishes() {
  const res = await request.get('/sam/dishes').catch(() => ({ dishes: [] }));
  return mapDocs(res.dishes);
}

async function getStaffQr() {
  const res = await request.get('/sam/staff-qr').catch(() => ({ qr_url: '' }));
  return res.qr_url || '';
}

async function setStaffQr(qrUrl) {
  return request.patch('/admin/sam/staff-qr', { qr_url: qrUrl });
}

async function getAllDishes() {
  const res = await request.get('/admin/sam/dishes').catch(() => ({ dishes: [] }));
  return mapDocs(res.dishes);
}

async function addDish(data) {
  const res = await request.post('/admin/sam/dishes', data);
  return mapDoc(res.dish);
}

async function updateDish(id, data) {
  return request.patch(`/admin/sam/dishes/${id}`, data);
}

async function deleteDish(id) {
  return request.del(`/admin/sam/dishes/${id}`);
}

async function getSamLocations() {
  const res = await request.get('/sam/locations').catch(() => ({ locations: [] }));
  return res.locations || [];
}

async function getAdminSamLocations() {
  const res = await request.get('/admin/sam/locations').catch(() => ({ locations: [] }));
  return res.locations || [];
}

async function addSamLocation(data) {
  return request.post('/admin/sam/locations', data);
}

async function updateSamLocation(id, data) {
  return request.patch(`/admin/sam/locations/${id}`, data);
}

async function deleteSamLocation(id) {
  return request.del(`/admin/sam/locations/${id}`);
}

async function createOrder(items, note, deliveryLocation) {
  const result = await request.post('/sam/orders', { items, note, delivery_location: deliveryLocation || '' });
  return {
    ...mapDoc(result.order),
    _skipped: result.skipped || [],
    _capped: result.capped || [],
  };
}

async function getOrder(id) {
  const res = await request.get(`/sam/orders/${id}`);
  return mapDoc(res.order);
}

async function getMyOrders() {
  const res = await request.get('/sam/orders/mine').catch(() => ({ orders: [] }));
  return mapDocs(res.orders);
}

async function getOrders(status) {
  const res = await request.get('/admin/sam/orders', { status }).catch(() => ({ orders: [] }));
  return mapDocs(res.orders);
}

async function getOrdersSummary(status) {
  const res = await request.get('/admin/sam/orders/summary', { status }).catch(() => ({ summary: [] }));
  return res.summary || [];
}

async function updateOrderStatus(id, status) {
  return request.patch(`/admin/sam/orders/${id}`, { status });
}

async function updateOrderAdminNote(id, adminNote) {
  return request.patch(`/admin/sam/orders/${id}`, { admin_note: adminNote });
}

async function cancelOrder(id) {
  return request.post(`/sam/orders/${id}/cancel`);
}

// ── 代购全局下单开关 ──

async function getSamOrderSwitch() {
  const res = await request.get('/admin/sam/order-switch').catch(() => ({ enabled: true }));
  return res.enabled !== false;
}

async function setSamOrderSwitch(enabled) {
  const res = await request.patch('/admin/sam/order-switch', { enabled });
  return res.enabled !== false;
}

// ── 管理员管理（超级管理员）──

async function searchUsers(keyword) {
  const res = await request.get('/admin/users/search', { q: keyword }).catch(() => ({ users: [] }));
  return mapDocs(res.users);
}

async function getAdmins() {
  const res = await request.get('/admin/admins').catch(() => ({ admins: [] }));
  return mapDocs(res.admins);
}

async function addAdmin(openid, permissions) {
  const res = await request.post('/admin/admins', { openid, permissions });
  return mapDoc(res.admin);
}

async function updateAdminPermissions(openid, permissions) {
  const res = await request.patch(`/admin/admins/${openid}`, { permissions });
  return mapDoc(res.admin);
}

async function removeAdmin(openid) {
  return request.del(`/admin/admins/${openid}`);
}

module.exports = {
  getStudios,
  getAllStudios,
  getPosts,
  getPost,
  createPost,
  deletePost,
  getComments,
  addComment,
  toggleLike,
  toggleFavorite,
  getUserProfile,
  getUserPosts,
  getMyProfile,
  updateUser,
  getUserStats,
  submitVerification,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  addStudio,
  incrementViewCount,
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
  setGatherQr,
  getDishes,
  getSamLocations,
  getAdminSamLocations,
  addSamLocation,
  updateSamLocation,
  deleteSamLocation,
  getStaffQr,
  setStaffQr,
  getAllDishes,
  addDish,
  updateDish,
  deleteDish,
  createOrder,
  getOrder,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  cancelOrder,
  getOrdersSummary,
  updateOrderAdminNote,
  getSamOrderSwitch,
  setSamOrderSwitch,
  searchUsers,
  getAdmins,
  addAdmin,
  updateAdminPermissions,
  removeAdmin,
  getScoreQuota,
  submitScore,
  getScoreHistory,
};
