const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { PAGE_SIZE } = require('../../utils/constants');

Page({
  data: { posts: [], loading: true, loadingMore: false, page: 1, hasMore: true },

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

  goPost(e) { wx.navigateTo({ url: `/pages/post-detail/index?id=${e.currentTarget.dataset.id}` }); },
  goBack() { wx.navigateBack(); },
});
