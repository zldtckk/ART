const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    keyword: '',
    results: [],
    loading: false,
    searched: false,
  },

  _timer: null,

  onInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    // 清空时重置
    if (!keyword.trim()) {
      this.setData({ results: [], searched: false });
      return;
    }
    // 输入停顿 500ms 后自动搜索
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.doSearch(keyword), 500);
  },

  onSearch() {
    clearTimeout(this._timer);
    this.doSearch(this.data.keyword);
  },

  async doSearch(keyword) {
    if (!keyword || !keyword.trim()) return;
    this.setData({ loading: true, searched: true });
    try {
      const results = await api.searchPosts(keyword.trim());
      this.setData({ results, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '搜索失败，请重试', icon: 'none' });
    }
  },

  clearInput() {
    this.setData({ keyword: '', results: [], searched: false });
  },

  onCardTap(e) {
    const post = e.detail.post;
    wx.navigateTo({ url: `/pages/post-detail/index?id=${post.id || post._id}` });
  },

  onLike(e) {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    const post = e.detail.post;
    const id = post.id || post._id;
    const wasLiked = post.is_liked;
    this.setData({
      results: this.data.results.map(p =>
        (p.id === id || p._id === id)
          ? { ...p, is_liked: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
          : p
      ),
    });
    api.toggleLike(id).catch(() => {
      this.setData({
        results: this.data.results.map(p =>
          (p.id === id || p._id === id) ? { ...p, is_liked: wasLiked, like_count: post.like_count } : p
        ),
      });
    });
  },

  onFavorite(e) {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    const post = e.detail.post;
    const id = post.id || post._id;
    api.toggleFavorite(id);
    this.setData({
      results: this.data.results.map(p =>
        (p.id === id || p._id === id) ? { ...p, is_favorited: !p.is_favorited } : p
      ),
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onUnload() {
    clearTimeout(this._timer);
  },
});
