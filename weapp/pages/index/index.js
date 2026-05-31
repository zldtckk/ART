const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { BOARDS, PAGE_SIZE } = require('../../utils/constants');

Page({
  data: {
    isLoggedIn: false,
    isVerified: false,
    currentUserId: null,
    hotPosts: [],
    bannerIdx: 0,
    posts: [],
    boards: BOARDS,
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'hot', name: '热帖' },
      { key: 'circle', name: '画室圈' },
      { key: 'market', name: '二手' },
    ],
    currentTab: 'all',
    loading: true,
    loadingMore: false,
    page: 1,
    hasMore: true,
  },

  onShow() {
    const authData = auth.getAuth();
    const user = authData.user;
    this.setData({
      isLoggedIn: authData.isLoggedIn,
      isVerified: !!(user && user.is_verified),
      currentUserId: (user && user._openid) || null,
    });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.loadHotPosts();
    this.loadPosts();
  },

  parseImages(imagesStr) {
    if (Array.isArray(imagesStr)) return imagesStr;
    try { return JSON.parse(imagesStr); } catch (e) { return []; }
  },

  getCircleTypeName(type) {
    const map = { general: '闲聊', help: '求助', treehole: '树洞', carpool: '拼车', lunch: '拼饭', other: '其他' };
    return map[type] || '';
  },

  _getCellSizes() {
    if (this._cellSizes) return this._cellSizes;
    const w = wx.getSystemInfoSync().windowWidth;
    const rpx = w / 750;
    const pad = Math.round(64 * rpx);
    const gap = Math.round(4 * rpx);
    this._cellSizes = {
      one: w - pad,
      two: Math.floor((w - pad - gap) / 2),
      three: Math.floor((w - pad - gap * 2) / 3),
    };
    return this._cellSizes;
  },

  processPosts(posts) {
    const sizes = this._getCellSizes();
    return (posts || []).map((p) => {
      const allImages = this.parseImages(p.images);
      const displayImages = allImages.slice(0, 9);
      const count = displayImages.length;
      let cellStyle = '';
      if (count === 1) cellStyle = `width:${sizes.one}px;height:${sizes.one}px;`;
      else if (count === 2) cellStyle = `width:${sizes.two}px;height:${sizes.two}px;`;
      else if (count >= 3) cellStyle = `width:${sizes.three}px;height:${sizes.three}px;`;
      return {
        ...p,
        _parsedImages: displayImages,
        _imageCount: count,
        _imgCellStyle: cellStyle,
        circle_type_name: this.getCircleTypeName(p.circle_type),
      };
    });
  },

  async loadHotPosts() {
    try {
      const posts = await api.getPosts({ sort: 'hot', limit: 5 });
      this.setData({ hotPosts: this.processPosts(posts) });
    } catch (e) { /* ignore */ }
  },

  onBannerChange(e) {
    this.setData({ bannerIdx: e.detail.current });
  },

  async loadPosts() {
    this.setData({ loading: true });
    try {
      const { currentTab } = this.data;
      const board = currentTab !== 'all' ? currentTab : undefined;
      const sort = currentTab === 'hot' ? 'hot' : undefined;
      const posts = await api.getPosts({ board, sort, limit: PAGE_SIZE });
      this.setData({
        posts: this.processPosts(posts),
        loading: false,
        page: 1,
        hasMore: posts.length >= PAGE_SIZE,
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true });
    const nextPage = this.data.page + 1;
    try {
      const { currentTab } = this.data;
      const board = currentTab !== 'all' ? currentTab : undefined;
      const posts = await api.getPosts({ board, page: nextPage, limit: PAGE_SIZE });
      const newPosts = this.processPosts(posts);
      this.setData({
        posts: this.data.posts.concat(newPosts),
        page: nextPage,
        loadingMore: false,
        hasMore: newPosts.length >= PAGE_SIZE,
      });
    } catch (e) {
      this.setData({ loadingMore: false });
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab, posts: [], page: 1, hasMore: true });
    this.loadPosts();
  },

  goPost(e) {
    wx.navigateTo({ url: `/pages/post-detail/index?id=${e.currentTarget.dataset.id}` });
  },

  async startChat(e) {
    const peerId = e.currentTarget.dataset.uid;
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    wx.showLoading({ title: '加载中' });
    try {
      const res = await api.getConversation(peerId);
      wx.hideLoading();
      wx.navigateTo({ url: `/pages/messages/index?convId=${res.conversation._id}` });
    } catch (e) {
      wx.hideLoading();
    }
  },

  goBoard(e) {
    const board = e.currentTarget.dataset.board;
    wx.navigateTo({ url: `/pages/board-${board}/index` });
  },

  goVerify() { wx.navigateTo({ url: '/pages/verify/index' }); },
  goLogin() { wx.navigateTo({ url: '/pages/login/index' }); },

  async onLike(e) {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    const id = e.currentTarget.dataset.id;
    try {
      const res = await api.toggleLike(id);
      const posts = this.data.posts.map((p) => {
        if (p._id === id) return { ...p, is_liked: res.liked, like_count: p.like_count + (res.liked ? 1 : -1) };
        return p;
      });
      this.setData({ posts });
    } catch (e) { /* ignore */ }
  },

  async onFavorite(e) {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    const id = e.currentTarget.dataset.id;
    try {
      const res = await api.toggleFavorite(id);
      const posts = this.data.posts.map((p) => {
        if (p._id === id) return { ...p, is_favorited: res.favorited };
        return p;
      });
      this.setData({ posts });
    } catch (e) { /* ignore */ }
  },

  onReachBottom() {
    this.loadMore();
  },
});
