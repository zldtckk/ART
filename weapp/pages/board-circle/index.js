const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { CIRCLE_TYPES, PAGE_SIZE } = require('../../utils/constants');

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

  getCircleTypeName(type) {
    const map = { general: '闲聊', help: '求助', treehole: '树洞', carpool: '拼车', lunch: '拼饭', other: '其他' };
    return map[type] || type;
  },

  processPosts(posts) {
    return (posts || []).map((p) => ({ ...p, circle_type_name: this.getCircleTypeName(p.circle_type) }));
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
  goCreate() { wx.navigateTo({ url: '/pages/create-post/index?board=circle' }); },

  async onLike(e) {
    const id = e.currentTarget.dataset.id;
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    try {
      const res = await api.toggleLike(id);
      const posts = this.data.posts.map((p) => {
        if (p._id === id) return { ...p, is_liked: res.liked, like_count: p.like_count + (res.liked ? 1 : -1) };
        return p;
      });
      this.setData({ posts });
    } catch (e) { /* ignore */ }
  },
});
