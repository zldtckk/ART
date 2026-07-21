const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { formatTime } = require('../../utils/formatter');

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
    selfAvatar: '',
    selfName: '我',
    swipeOpenId: null,
    sendingImage: false,
    pendingImage: '',
    notificationUnread: 0,
    messageUnread: 0,
    scrollTop: 0,
    inputFocus: false,
  },
  _touchStartX: 0,
  _touchItemId: null,

  onLoad(options) {
    if (options.convId) {
      const chatUser = {
        name: options.peerName ? decodeURIComponent(options.peerName) : '用户',
        avatar: options.peerAvatar ? decodeURIComponent(options.peerAvatar) : '',
      };
      this.setData({ convId: options.convId, chatUser });
      this.openChat(options.convId);
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    const authData = auth.getAuth();
    const user = authData.user;
    this.setData({
      currentUserId: (user && user._openid) || null,
      selfAvatar: (user && user.avatar_url) || '',
      selfName: (user && user.nickname) || '我',
    });
    this.loadConversations();
    this.loadNotifications();
    this.loadTabUnread();

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
      this.setData({ notificationUnread: 0 });
      api.markNotificationsRead().catch(() => {});
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().pollUnread();
      }
    }
  },

  loadTabUnread() {
    api.getUnreadCount().then(res => {
      this.setData({
        notificationUnread: res.notification_unread || 0,
        messageUnread: res.message_unread || 0,
      });
    }).catch(() => {});
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
      this.scrollToBottom();
      api.markConversationRead(convId).catch(() => {});
      this.loadTabUnread();
    }).catch((e) => {
      console.error('openChat failed', e);
      this.setData({ loading: false, convId: null });
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    });
  },

  backToList() {
    this.setData({ convId: null, messages: [] });
  },
  goBack() { wx.navigateBack(); },

  onMessageInput(e) { this.setData({ messageText: e.detail.value }); },

  // 发送：文字和刚才选好待发的图片（如果有）一起发出去，不再选完图就自动发
  // input 上加了 hold-keyboard，点发送按钮这种非输入框区域键盘本来就不会收起，
  // 不需要再手动收一次焦点重新抢回来
  sendMessage() {
    const text = this.data.messageText.trim();
    const imageUrl = this.data.pendingImage;
    if (!text && !imageUrl) return;

    const type = imageUrl ? (text ? 'mixed' : 'image') : 'text';
    const extra = imageUrl ? { type, image_url: imageUrl } : {};

    this.setData({ messageText: '', pendingImage: '', sendingImage: false });
    api.sendMessage(this.data.convId, text, extra).then(res => {
      if (res && res.message) {
        this.setData({ messages: [...this.data.messages, res.message] });
        this.scrollToBottom();
      } else {
        this.setData({ messageText: text, pendingImage: imageUrl });
        wx.showToast({ title: (res && res.msg) || '发送失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ messageText: text, pendingImage: imageUrl });
      wx.showToast({ title: '发送失败，请重试', icon: 'none' });
    });
  },

  // scroll-into-view 只有值真正变化才会触发滚动，改用 scroll-top 更可靠：
  // 每次都加一个足够大的增量，微信会自动 clamp 到实际可滚动的最大位置
  scrollToBottom() {
    this.setData({ scrollTop: this.data.scrollTop + 100000 });
  },

  // 选图片：先上传好，展示成待发预览，等用户点"发送"才真正发出去
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths[0];
        this.setData({ sendingImage: true });
        api.uploadImage(filePath).then(url => {
          this.setData({ sendingImage: false, pendingImage: url });
        }).catch(() => {
          this.setData({ sendingImage: false });
          wx.showToast({ title: '上传失败', icon: 'none' });
        });
      },
    });
  },

  removePendingImage() {
    this.setData({ pendingImage: '' });
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
    const conv = this.data.conversations.find(c => (c._id || c.id) === id);
    if (conv) {
      this.setData({
        chatUser: { name: conv.peer_name || '用户', avatar: conv.peer_avatar || '' },
        conversations: this.data.conversations.map(c =>
          (c._id || c.id) === id ? { ...c, unread_count: 0 } : c
        ),
      });
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
