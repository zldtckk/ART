const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    post: null,
    comments: [],
    loading: true,
    commentText: '',
    submitting: false,
    currentUser: null,
    isLoggedIn: false,
    isSelf: false,
  },
  postId: '',

  onLoad(options) {
    this.postId = options.id;
    const authData = auth.getAuth();
    this.setData({
      currentUser: authData.user || null,
      isLoggedIn: !!authData.isLoggedIn,
    });
    if (this.postId) this.loadPost();
    else wx.navigateBack();
  },

  parseImages(imagesStr) {
    if (Array.isArray(imagesStr)) return imagesStr;
    try { return JSON.parse(imagesStr); } catch (e) { return []; }
  },

  getCircleTypeName(type) {
    const map = { general: '闲聊', help: '求助', treehole: '树洞', carpool: '拼车', lunch: '拼饭', other: '其他' };
    return map[type] || type;
  },

  async loadPost() {
    try {
      const [post, comments] = await Promise.all([
        api.getPost(this.postId),
        api.getComments(this.postId),
      ]);
      if (post) {
        post._parsedImages = this.parseImages(post.images);
        post.circle_type_name = this.getCircleTypeName(post.circle_type);
      }
      const user = auth.getAuth().user;
      this.setData({
        post,
        comments: comments || [],
        isSelf: post && !post.is_anonymous && user && post._openid === user._openid,
        loading: false,
      });
    } catch (e) {
      wx.showToast({ title: '帖子不存在', icon: 'none' });
      wx.navigateBack();
    }
  },

  async handleLike() {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    try {
      const post = this.data.post;
      const res = await api.toggleLike(this.postId, post && post.user_id);
      if (post) {
        this.setData({
          post: { ...post, is_liked: res.liked, like_count: post.like_count + (res.liked ? 1 : -1) },
        });
      }
    } catch (e) { /* ignore */ }
  },

  async handleFavorite() {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    try {
      const res = await api.toggleFavorite(this.postId);
      const post = this.data.post;
      if (post) this.setData({ post: { ...post, is_favorited: res.favorited } });
    } catch (e) { /* ignore */ }
  },

  onCommentInput(e) { this.setData({ commentText: e.detail.value }); },

  async handleComment() {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    if (!this.data.commentText.trim()) return;
    this.setData({ submitting: true });
    try {
      const comment = await api.addComment(this.postId, this.data.commentText.trim());
      this.setData({
        comments: [...this.data.comments, comment],
        commentText: '',
        post: this.data.post ? { ...this.data.post, comment_count: this.data.post.comment_count + 1 } : null,
      });
    } catch (e) { /* ignore */ }
    this.setData({ submitting: false });
  },

  async startChat(e) {
    const peerId = e.currentTarget.dataset.uid;
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    try {
      const res = await api.getConversation(peerId);
      wx.navigateTo({ url: `/pages/messages/index?convId=${res.conversation._id}` });
    } catch (e) { /* ignore */ }
  },

  handleDelete() {
    const hasComments = this.data.comments.length > 0;
    wx.showModal({
      title: '删除帖子',
      content: hasComments ? '删除后评论也会一并消失，确定删除？' : '确定删除这条帖子？',
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中' });
        api.deletePost(this.postId).then(() => {
          wx.hideLoading();
          getApp().globalData.feedNeedsRefresh = true;
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 800);
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '删除失败', icon: 'none' });
        });
      },
    });
  },

  onShareAppMessage() {
    const post = this.data.post;
    const title = post ? (post.content || '').slice(0, 30) : '来看看这条帖子';
    const imageUrl = (post && post._parsedImages && post._parsedImages[0]) || '';
    return {
      title: title || '来看看这条帖子',
      path: `/pages/post-detail/index?id=${this.postId}`,
      imageUrl,
    };
  },

  onShareTimeline() {
    const post = this.data.post;
    const title = post ? (post.content || '').slice(0, 30) : '来看看这条帖子';
    const imageUrl = (post && post._parsedImages && post._parsedImages[0]) || '';
    return {
      title: title || '来看看这条帖子',
      query: `id=${this.postId}`,
      imageUrl,
    };
  },

  goBack() { wx.navigateBack(); },
  goVerify() { wx.navigateTo({ url: '/pages/verify/index' }); },
});
