const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { PAGE_SIZE } = require('../../utils/constants');

Page({
  data: { posts: [], loading: true, loadingMore: false, page: 1, hasMore: true, swipeOpenId: null },
  _touchStartX: 0,
  _touchItemId: null,

  onLoad() { this.loadPosts(); },

  onShow() {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    if (!this.data.loading) {
      this.setData({ page: 1, posts: [] });
      this.loadPosts();
    }
  },

  processPosts(posts) {
    return (posts || []).map(p => ({ ...p, _parsedImages: Array.isArray(p.images) ? p.images : [] }));
  },

  loadPosts() {
    api.getMyPosts({ page: this.data.page, limit: PAGE_SIZE }).then(posts => {
      const processed = this.processPosts(posts);
      this.setData({
        posts: this.data.page === 1 ? processed : this.data.posts.concat(processed),
        loading: false, loadingMore: false,
        hasMore: posts.length >= PAGE_SIZE,
      });
    }).catch(() => this.setData({ loading: false, loadingMore: false }));
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    this.loadPosts();
  },

  onSwipeStart(e) {
    this._touchStartX = e.touches[0].clientX;
    this._touchItemId = e.currentTarget.dataset.id;
  },
  onSwipeMove(e) {
    const dx = e.touches[0].clientX - this._touchStartX;
    if (dx < -40) this.setData({ swipeOpenId: this._touchItemId });
    else if (dx > 10) this.setData({ swipeOpenId: null });
  },
  onSwipeEnd() { this._touchStartX = 0; },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.swipeOpenId === id) { this.setData({ swipeOpenId: null }); return; }
    wx.navigateTo({ url: `/pages/post-detail/index?id=${id}` });
  },

  deletePost(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ swipeOpenId: null });
    wx.showModal({
      title: '删除帖子',
      content: '删除后评论也会一并消失，确定删除？',
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中' });
        api.deletePost(id).then(() => {
          wx.hideLoading();
          getApp().globalData.feedNeedsRefresh = true;
          wx.showToast({ title: '已删除', icon: 'success' });
          this.setData({ posts: this.data.posts.filter(p => (p._id || p.id) !== id) });
        }).catch(() => { wx.hideLoading(); wx.showToast({ title: '删除失败', icon: 'none' }); });
      },
    });
  },

  goPost(e) { wx.navigateTo({ url: `/pages/post-detail/index?id=${e.currentTarget.dataset.id}` }); },
  goBack() { wx.navigateBack(); },
});
