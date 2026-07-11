const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { BOARDS, PAGE_SIZE } = require('../../utils/constants');
const { getCircleTypeName } = require('../../utils/formatter');
const { CITIES } = require('../../config/city');

Page({
  data: {
    headerPaddingRight: 100,
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
    refreshing: false,
    currentCity: 'hangzhou',
    currentCityName: '杭州',
    cities: CITIES,
  },

  onLoad() {
    // 计算胶囊按钮左边距，让搜索栏不被遮挡
    try {
      const capsule = wx.getMenuButtonBoundingClientRect();
      const sys = wx.getSystemInfoSync();
      const rightGap = sys.windowWidth - capsule.left + 8;
      this.setData({ headerPaddingRight: rightGap });
    } catch (e) {
      this.setData({ headerPaddingRight: 100 });
    }
    this.loadHotPosts();
    this.loadPosts();
  },

  onShow() {
    const authData = auth.getAuth();
    const user = authData.user;
    this.setData({
      isLoggedIn: authData.isLoggedIn,
      isVerified: !!(user && user.is_verified),
      currentUserId: (user && user._openid) || null,
    });
    const app = getApp();
    const city = app.getCurrentCity();
    const cityName = app.getCityName();
    if (city !== this.data.currentCity) {
      this.setData({ currentCity: city, currentCityName: cityName, posts: [], page: 1, hasMore: true });
      this.loadHotPosts();
      this.loadPosts();
    } else {
      this.setData({ currentCity: city, currentCityName: cityName });
    }

    // 新用户首次进入，弹城市选择
    if (!wx.getStorageSync('currentCity') && !this._cityPickerShown) {
      this._cityPickerShown = true;
      this.switchCity();
    }

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    if (getApp().globalData.feedNeedsRefresh) {
      getApp().globalData.feedNeedsRefresh = false;
      this.setData({ page: 1, hasMore: true });
      this.loadHotPosts();
      this.loadPosts();
    }
  },

  onRefresh() {
    this.setData({ refreshing: true, page: 1, hasMore: true });
    Promise.all([this.loadHotPosts(), this.loadPosts()]).finally(() => {
      this.setData({ refreshing: false });
    });
  },

  parseImages(imagesStr) {
    if (Array.isArray(imagesStr)) return imagesStr;
    try { return JSON.parse(imagesStr); } catch (e) { return []; }
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
        circle_type_name: getCircleTypeName(p.circle_type),
      };
    });
  },

  async loadHotPosts() {
    try {
      const posts = await api.getPosts({ sort: 'hot', limit: 20 });
      const withImages = this.processPosts(posts).filter(p => p._imageCount > 0).slice(0, 6);
      this.setData({ hotPosts: withImages });
    } catch (e) { console.error('loadHotPosts failed', e); }
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

  goUserProfile(e) {
    const { uid } = e.currentTarget.dataset;
    if (!uid) return;
    wx.navigateTo({ url: `/pages/user-profile/index?uid=${uid}` });
  },

  goBoard(e) {
    const board = e.currentTarget.dataset.board;
    wx.navigateTo({ url: `/pages/board-${board}/index` });
  },

  goGatherings() {
    wx.switchTab({ url: '/pages/gatherings/index' });
  },

  goSamShop() {
    wx.navigateTo({ url: '/pages/sam-shop/index' });
  },

  goSearch() { wx.navigateTo({ url: '/pages/search/index' }); },
  goVerify() { wx.navigateTo({ url: '/pages/verify/index' }); },
  goLogin() { wx.navigateTo({ url: '/pages/login/index' }); },

  onLike(e) {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    const id = e.currentTarget.dataset.id;
    const post = this.data.posts.find(p => p._id === id || p.id === id);
    if (!post) return;
    const wasLiked = post.is_liked;
    // 乐观更新
    this.setData({
      posts: this.data.posts.map(p =>
        (p._id === id || p.id === id)
          ? { ...p, is_liked: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
          : p
      ),
    });
    api.toggleLike(id).catch(() => {
      this.setData({
        posts: this.data.posts.map(p =>
          (p._id === id || p.id === id) ? { ...p, is_liked: wasLiked, like_count: post.like_count } : p
        ),
      });
    });
  },

  onFavorite(e) {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    const id = e.currentTarget.dataset.id;
    const post = this.data.posts.find(p => p._id === id || p.id === id);
    if (!post) return;
    const wasFavorited = post.is_favorited;
    this.setData({
      posts: this.data.posts.map(p =>
        (p._id === id || p.id === id) ? { ...p, is_favorited: !wasFavorited } : p
      ),
    });
    api.toggleFavorite(id).catch(() => {
      this.setData({
        posts: this.data.posts.map(p =>
          (p._id === id || p.id === id) ? { ...p, is_favorited: wasFavorited } : p
        ),
      });
    });
  },

  switchCity() {
    const cities = this.data.cities;
    const current = this.data.currentCity;
    const names = cities.map(c => c.name);
    let picked = false;
    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        picked = true;
        const city = cities[res.tapIndex];
        if (city && city.slug !== current) {
          getApp().setCurrentCity(city.slug);
          this.setData({ currentCity: city.slug, currentCityName: city.name, posts: [], page: 1, hasMore: true });
          this.loadHotPosts();
          this.loadPosts();
        }
      },
      complete: () => {
        // 用户取消了选择，reset 标记让下次还能弹
        if (!picked) this._cityPickerShown = false;
      },
    });
  },

  onReachBottom() {
    this.loadMore();
  },

  onShareAppMessage() {
    const city = CITIES.find(c => c.slug === this.data.currentCity);
    return {
      title: city ? city.shareTitle : '画室圈',
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    const city = CITIES.find(c => c.slug === this.data.currentCity);
    return {
      title: city ? city.shareTitle : '画室圈',
      query: '',
    };
  },
});
