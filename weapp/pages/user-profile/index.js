const api = require('../../utils/api');
const auth = require('../../utils/auth');

const PAGE_LIMIT = 20;

Page({
  data: {
    user: null,
    posts: [],
    isSelf: false,
    loading: true,
    loadingMore: false,
    page: 1,
    hasMore: true,
  },
  uid: '',

  async onLoad(options) {
    this.uid = options.uid;
    const currentUser = auth.getAuth().user;
    const isSelf = !!(currentUser && currentUser._openid === this.uid);
    this.setData({ isSelf });
    await Promise.all([this.loadUser(), this.loadPosts(1)]);
  },

  async loadUser() {
    try {
      const user = await api.getUserProfile(this.uid);
      if (!user) return;
      if (user.studio_id && !user.studio_name) {
        try {
          const studios = await api.getStudios();
          const studio = studios.find(s => s.id === user.studio_id || s._id === user.studio_id);
          if (studio) user.studio_name = studio.name;
        } catch (e) { /* ignore */ }
      }
      this.setData({ user });
    } catch (e) { /* ignore */ }
  },

  async loadPosts(page) {
    try {
      const db = api.db;
      const res = await db.collection('posts')
        .where({ _openid: this.uid, is_anonymous: false })
        .orderBy('createTime', 'desc')
        .skip((page - 1) * PAGE_LIMIT)
        .limit(PAGE_LIMIT)
        .get();
      const posts = res.data.map(p => ({ ...p, id: p._id }));
      this.setData({
        posts: page === 1 ? posts : this.data.posts.concat(posts),
        loading: false,
        loadingMore: false,
        page,
        hasMore: posts.length >= PAGE_LIMIT,
      });
    } catch (e) {
      this.setData({ loading: false, loadingMore: false });
    }
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true });
    this.loadPosts(this.data.page + 1);
  },

  goPost(e) {
    wx.navigateTo({ url: `/pages/post-detail/index?id=${e.currentTarget.dataset.id}` });
  },

  async startChat() {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    if (!this.uid) { wx.showToast({ title: '用户信息缺失', icon: 'none' }); return; }
    wx.showLoading({ title: '加载中' });
    try {
      const res = await api.getConversation(this.uid);
      wx.hideLoading();
      const convId = res && res.conversation && res.conversation._id;
      if (!convId) {
        wx.showToast({ title: '创建会话失败', icon: 'none' });
        return;
      }
      getApp().globalData.pendingConvId = convId;
      wx.switchTab({ url: '/pages/messages/index' });
    } catch (e) {
      wx.hideLoading();
      console.error('startChat failed', e);
      wx.showToast({ title: '私信失败，请重试', icon: 'none' });
    }
  },

  goBack() { wx.navigateBack(); },
});
