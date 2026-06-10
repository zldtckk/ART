const api = require('../../utils/api');
const { MARKET_CATEGORIES, MARKET_TAGS, PAGE_SIZE } = require('../../utils/constants');

Page({
  data: {
    categories: [{ key: 'all', name: '全部' }, ...MARKET_CATEGORIES],
    tags: [{ key: 'all', name: '全部' }, ...MARKET_TAGS],
    currentCategory: 'all',
    currentTag: 'all',
    posts: [],
    loading: true,
    loadingMore: false,
    page: 1,
    hasMore: true,
  },

  onLoad() { this.loadPosts(); },
  goCreate() { wx.navigateTo({ url: '/pages/create-post/index?board=market' }); },
  goBack() { wx.navigateBack(); },

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
    const tagNames = { buy: '求购', sell: '出售', free: '赠送' };
    const catNames = { art_supplies: '画材', textbooks: '教材', life: '生活', digital: '数码', other: '其他' };
    return (posts || []).map((p) => {
      const allImages = this._parseImages(p.images);
      const displayImages = allImages.slice(0, 9);
      const count = displayImages.length;
      let cellStyle = '';
      if (count === 1) cellStyle = `width:${sizes.one}px;height:${sizes.one}px;`;
      else if (count === 2) cellStyle = `width:${sizes.two}px;height:${sizes.two}px;`;
      else if (count >= 3) cellStyle = `width:${sizes.three}px;height:${sizes.three}px;`;
      return { ...p, _market_tag_name: tagNames[p.market_tag] || '出售', _market_cat_name: catNames[p.market_category] || p.market_category || '画材', _parsedImages: displayImages, _imageCount: count, _imgCellStyle: cellStyle };
    });
  },

  switchCategory(e) {
    this.setData({ currentCategory: e.currentTarget.dataset.key, posts: [], page: 1, hasMore: true, loading: true });
    this.loadPosts();
  },

  switchTag(e) {
    this.setData({ currentTag: e.currentTarget.dataset.key, posts: [], page: 1, hasMore: true, loading: true });
    this.loadPosts();
  },

  async loadPosts() {
    const market_category = this.data.currentCategory !== 'all' ? this.data.currentCategory : undefined;
    const market_tag = this.data.currentTag !== 'all' ? this.data.currentTag : undefined;
    try {
      const posts = await api.getPosts({ board: 'market', market_category, market_tag, page: this.data.page, limit: PAGE_SIZE });
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

  onShareAppMessage() {
    return {
      title: '二手集市 - 画材、教材、低价好物',
      path: '/pages/board-market/index',
    };
  },

  onShareTimeline() {
    return {
      title: '二手集市 - 画材、教材、低价好物',
      query: '',
    };
  },

  goUserProfile(e) {
    const { uid, anon } = e.currentTarget.dataset;
    if (!uid || anon) return;
    wx.navigateTo({ url: `/pages/user-profile/index?uid=${uid}` });
  },
});
