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
      const res = await api.toggleLike(this.postId);
      const post = this.data.post;
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

  goBack() { wx.navigateBack(); },
  goVerify() { wx.navigateTo({ url: '/pages/verify/index' }); },
});
