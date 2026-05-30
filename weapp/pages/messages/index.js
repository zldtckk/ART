const api = require('../../utils/api');
const auth = require('../../utils/auth');

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
  },

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
      const conversations = await api.getConversationList();
      const user = auth.getAuth().user;
      const myOpenid = user && user._openid;

      const enriched = await Promise.all((conversations || []).map(async (conv) => {
        const peerId = conv.user1 === myOpenid ? conv.user2 : conv.user1;
        try {
          const peer = await api.getUserProfile(peerId);
          return { ...conv, peer_name: (peer && peer.nickname) || '用户' };
        } catch (e) {
          return { ...conv, peer_name: '用户' };
        }
      }));

      this.setData({ conversations: enriched });
    } catch (e) { /* ignore */ }
  },

  loadNotifications() {
    api.getNotifications().then(res => {
      this.setData({ notifications: res.notifications || [] });
    }).catch(() => {});
  },

  openChat(e) {
    const convId = typeof e === 'string' ? e : (e && e.currentTarget ? e.currentTarget.dataset.convid : null);
    if (!convId) return;
    this.setData({ convId, loading: true });
    api.getConversationMessages(convId).then(messages => {
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
      if (res.message) {
        this.setData({ messages: [...this.data.messages, res.message] });
      }
    }).catch(() => {});
  },

  goPost(e) {
    if (e.currentTarget.dataset.postid) {
      wx.navigateTo({ url: `/pages/post-detail/index?id=${e.currentTarget.dataset.postid}` });
    }
  },
});
