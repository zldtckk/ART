const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { PAGE_SIZE } = require('../../utils/constants');

Page({
  data: { comments: [], loading: true, loadingMore: false, page: 1, hasMore: true },

  onLoad() { this.loadComments(); },

  onShow() {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
  },

  loadComments() {
    api.getMyComments({ page: this.data.page, limit: PAGE_SIZE }).then(comments => {
      this.setData({
        comments: this.data.page === 1 ? comments : this.data.comments.concat(comments),
        loading: false, loadingMore: false,
        hasMore: comments.length >= PAGE_SIZE,
      });
    }).catch(() => this.setData({ loading: false, loadingMore: false }));
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    this.loadComments();
  },

  goPost(e) { wx.navigateTo({ url: `/pages/post-detail/index?id=${e.currentTarget.dataset.postid}` }); },
  goBack() { wx.navigateBack(); },
});
