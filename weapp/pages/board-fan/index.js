const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { FAN_TYPES, PAGE_SIZE } = require('../../utils/constants');
const { getFanTypeName } = require('../../utils/formatter');
const { handleApiError } = require('../../utils/verifyGate');

Page({
  data: {
    types: [{ key: 'all', name: '全部' }, ...FAN_TYPES],
    currentType: 'all',
    posts: [],
    loading: true,
    loadingMore: false,
    page: 1,
    hasMore: true,
  },

  onLoad() { this.loadPosts(); },
  onShow() { this.setData({ isLoggedIn: auth.isLoggedIn() }); },
  goBack() { wx.navigateBack(); },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentType: type, posts: [], page: 1, hasMore: true, loading: true });
    this.loadPosts();
  },

  processPosts(posts) {
    return (posts || []).map(p => ({
      ...p,
      fan_type_name: getFanTypeName(p.fan_type),
    }));
  },

  async loadPosts() {
    const fan_type = this.data.currentType !== 'all' ? this.data.currentType : undefined;
    try {
      const posts = await api.getPosts({ board: 'fan', fan_type, page: this.data.page, limit: PAGE_SIZE });
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
  goUserProfile(e) {
    const uid = e.currentTarget.dataset.uid;
    if (!uid) return;
    wx.navigateTo({ url: `/pages/user-profile/index?uid=${uid}` });
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
});
