const api = require('../../utils/api');
const auth = require('../../utils/auth');

function formatTime(val) {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(typeof val === 'object' && val.$date ? val.$date : val);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (d.toDateString() === now.toDateString()) return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

Page({
  data: {
    tab: 'chat',
    conversations: [],
    notifications: [],
    chatUser: null,
    messages: [],
    messageText: '',
    loading: true,
    convId: null,
    currentUserId: null,
    swipeOpenId: null,
  },
  _touchStartX: 0,
  _touchItemId: null,

  onLoad(options) {
    if (options.convId) {
      this.setData({ convId: options.convId });
      this.openChat(options.convId);
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    const authData = auth.getAuth();
    const user = authData.user;
    this.setData({ currentUserId: (user && user._openid) || null });
    this.loadConversations();
    this.loadNotifications();

    const pendingConvId = getApp().globalData.pendingConvId;
    if (pendingConvId) {
      getApp().globalData.pendingConvId = null;
      this.openChat(pendingConvId);
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    if (tab === 'notification') {
      api.markNotificationsRead().catch(() => {});
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().pollUnread();
      }
    }
  },

  async loadConversations() {
    try {
      // 云函数已返回 peer_name/peer_avatar，无需逐条查询
      const conversations = await api.getConversationList();
      const formatted = (conversations || []).map(conv => ({
        ...conv,
        peer_name: conv.peer_name || '用户',
        last_message_at: formatTime(conv.last_message_at),
      }));
      this.setData({ conversations: formatted });
    } catch (e) { /* ignore */ }
  },

  loadNotifications() {
    api.getNotifications().then(res => {
      const notifications = (res.notifications || []).map(n => ({
        ...n,
        created_at: formatTime(n.createTime || n.created_at),
      }));
      this.setData({ notifications });
    }).catch(() => {});
  },

  openChat(e) {
    const convId = typeof e === 'string' ? e : (e && e.currentTarget ? e.currentTarget.dataset.convid : null);
    if (!convId) return;
    this.setData({ convId, loading: true });
    api.getConversationMessages(convId).then(rawMessages => {
      const messages = (rawMessages || []).map(m => ({ ...m, created_at: formatTime(m.createTime || m.created_at) }));
      this.setData({ messages, loading: false });
      api.markConversationRead(convId).catch(() => {});
    }).catch(() => this.setData({ loading: false }));
  },

  backToList() {
    this.setData({ convId: null, messages: [] });
  },

  onMessageInput(e) { this.setData({ messageText: e.detail.value }); },

  sendMessage() {
    if (!this.data.messageText.trim()) return;
    const text = this.data.messageText.trim();
    this.setData({ messageText: '' });
    api.sendMessage(this.data.convId, text).then(res => {
      if (res && res.message) {
        this.setData({ messages: [...this.data.messages, res.message] });
      } else {
        this.setData({ messageText: text });
        wx.showToast({ title: (res && res.msg) || '发送失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ messageText: text });
      wx.showToast({ title: '发送失败，请重试', icon: 'none' });
    });
  },


  onSwipeStart(e) {
    this._touchStartX = e.touches[0].clientX;
    this._touchItemId = e.currentTarget.dataset.id;
  },

  onSwipeMove(e) {
    const dx = e.touches[0].clientX - this._touchStartX;
    if (dx < -40) {
      this.setData({ swipeOpenId: this._touchItemId });
    } else if (dx > 10) {
      this.setData({ swipeOpenId: null });
    }
  },

  onSwipeEnd() {
    this._touchStartX = 0;
  },

  onConvTap(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.swipeOpenId === id) {
      this.setData({ swipeOpenId: null });
      return;
    }
    this.openChat(e);
  },

  onNotifTap(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.swipeOpenId === id) {
      this.setData({ swipeOpenId: null });
      return;
    }
    const notif = this.data.notifications.find(n => (n._id || n.id) === id);
    this.setData({
      notifications: this.data.notifications.map(n =>
        (n._id || n.id) === id ? { ...n, is_read: true } : n
      ),
    });
    if (!notif) return;
    if (notif.related_post_id) {
      wx.navigateTo({ url: `/pages/post-detail/index?id=${notif.related_post_id}` });
    } else if (notif.type === 'verify_result') {
      if (notif.title && notif.title.includes('通过') && !notif.title.includes('未通过')) {
        wx.switchTab({ url: '/pages/profile/index' });
      } else {
        wx.navigateTo({ url: '/pages/verify/index' });
      }
    }
  },

  deleteConv(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ swipeOpenId: null });
    wx.showLoading({ title: '删除中' });
    api.deleteConversation(id).then(() => {
      wx.hideLoading();
      this.setData({ conversations: this.data.conversations.filter(c => (c._id || c.id) !== id) });
    }).catch(() => { wx.hideLoading(); wx.showToast({ title: '删除失败', icon: 'none' }); });
  },

  deleteNotif(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ swipeOpenId: null });
    wx.showLoading({ title: '删除中' });
    api.deleteNotification(id).then(() => {
      wx.hideLoading();
      this.setData({ notifications: this.data.notifications.filter(n => (n._id || n.id) !== id) });
    }).catch(() => { wx.hideLoading(); wx.showToast({ title: '删除失败', icon: 'none' }); });
  },

  goPost(e) {
    if (e.currentTarget.dataset.postid) {
      wx.navigateTo({ url: `/pages/post-detail/index?id=${e.currentTarget.dataset.postid}` });
    }
  },
});
