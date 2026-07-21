const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { CIRCLE_TYPES, PAGE_SIZE } = require('../../utils/constants');
const { getCircleTypeName } = require('../../utils/formatter');
const { handleApiError } = require('../../utils/verifyGate');

Page({
  data: {
    types: [{ key: 'all', name: '全部' }, ...CIRCLE_TYPES],
    currentType: 'all',
    posts: [],
    loading: true,
    loadingMore: false,
    page: 1,
    hasMore: true,
  },

  onShow() {
    this.setData({ isLoggedIn: auth.isLoggedIn() });
  },

  onLoad() { this.loadPosts(); },
  goBack() { wx.navigateBack(); },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentType: type, posts: [], page: 1, hasMore: true, loading: true });
    this.loadPosts();
  },

  _parseImages(imagesStr) {
    if (Array.isArray(imagesStr)) return imagesStr;
    try { return JSON.parse(imagesStr); } catch (e) { return []; }
  },

  _getCellSizes() {
    if (this._cellSizes) return this._cellSizes;
    const w = wx.getSystemInfoSync().windowWidth;
    const rpx = w / 750;
    // card margin 32rpx×2 + card padding 32rpx×2 = 128rpx
    const pad = Math.round(128 * rpx);
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
      const allImages = this._parseImages(p.images);
      const displayImages = allImages.slice(0, 9);
      const count = displayImages.length;
      let cellStyle = '';
      if (count === 1) cellStyle = `width:${sizes.one}px;height:${sizes.one}px;`;
      else if (count === 2) cellStyle = `width:${sizes.two}px;height:${sizes.two}px;`;
      else if (count >= 3) cellStyle = `width:${sizes.three}px;height:${sizes.three}px;`;
      return { ...p, circle_type_name: getCircleTypeName(p.circle_type), _parsedImages: displayImages, _imageCount: count, _imgCellStyle: cellStyle };
    });
  },

  async loadPosts() {
    const circle_type = this.data.currentType !== 'all' ? this.data.currentType : undefined;
    try {
      const posts = await api.getPosts({ board: 'circle', circle_type, page: this.data.page, limit: PAGE_SIZE });
      this.setData({
        posts: this.data.page === 1 ? this.processPosts(posts) : this.data.posts.concat(this.processPosts(posts)),
        loading: false,
        loadingMore: false,
        hasMore: posts.length >= PAGE_SIZE,
      });
    } catch (e) {
      this.setData({ loading: false, loadingMore: false });
    }
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    this.loadPosts();
  },

  goPost(e) { wx.navigateTo({ url: `/pages/post-detail/index?id=${e.currentTarget.dataset.id}` }); },
  goCreate() {
    // create-post 是 tabBar 页，navigateTo 打不进去，得用 switchTab；
    // query 传不过去，用 globalData 暂存，create-post 的 onShow 里消费
    getApp().globalData.pendingBoard = 'circle';
    wx.switchTab({ url: '/pages/create-post/index' });
  },

  onShareAppMessage() {
    return {
      title: '艺考圈子 - 集训日常、求助、树洞',
      path: '/pages/board-circle/index',
    };
  },

  onShareTimeline() {
    return {
      title: '艺考圈子 - 集训日常、求助、树洞',
      query: '',
    };
  },

  onLike(e) {
    const id = e.currentTarget.dataset.id;
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    const post = this.data.posts.find(p => p._id === id || p.id === id);
    if (!post) return;
    const wasLiked = post.is_liked;
    this.setData({
      posts: this.data.posts.map(p =>
        (p._id === id || p.id === id)
          ? { ...p, is_liked: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
          : p
      ),
    });
    api.toggleLike(id).catch((err) => {
      this.setData({
        posts: this.data.posts.map(p =>
          (p._id === id || p.id === id) ? { ...p, is_liked: wasLiked, like_count: post.like_count } : p
        ),
      });
      handleApiError(err);
    });
  },

  goUserProfile(e) {
    const { uid } = e.currentTarget.dataset;
    if (!uid) return;
    wx.navigateTo({ url: `/pages/user-profile/index?uid=${uid}` });
  },
});
