const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { getCircleTypeName } = require('../../utils/formatter');

Page({
  data: {
    post: null,
    comments: [],
    loading: true,
    commentText: '',
    commentValid: false,
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


  async loadPost() {
    try {
      const [post, comments] = await Promise.all([
        api.getPost(this.postId),
        api.getComments(this.postId),
      ]);
      if (post) {
        post._parsedImages = this.parseImages(post.images);
        post.circle_type_name = getCircleTypeName(post.circle_type);
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

  handleLike() {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    const post = this.data.post;
    if (!post) return;
    // 乐观更新：立即更新 UI
    const wasLiked = post.is_liked;
    this.setData({
      post: { ...post, is_liked: !wasLiked, like_count: post.like_count + (wasLiked ? -1 : 1) },
    });
    api.toggleLike(this.postId).catch(() => {
      this.setData({ post: { ...this.data.post, is_liked: wasLiked, like_count: post.like_count } });
    });
  },

  handleFavorite() {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    const post = this.data.post;
    if (!post) return;
    // 乐观更新
    const wasFavorited = post.is_favorited;
    this.setData({ post: { ...post, is_favorited: !wasFavorited } });
    api.toggleFavorite(this.postId).catch(() => {
      this.setData({ post: { ...this.data.post, is_favorited: wasFavorited } });
    });
  },

  onCommentInput(e) {
    const val = e.detail.value;
    this.setData({ commentText: val, commentValid: val.trim().length > 0 });
  },

  handleComment() {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    const text = this.data.commentText.trim();
    if (!text || this.data.submitting) return;

    const user = this.data.currentUser || {};
    const tempId = `temp_${Date.now()}`;

    // 乐观插入：立刻显示评论，输入框清空
    this.setData({
      comments: [...this.data.comments, {
        _id: tempId,
        id: tempId,
        content: text,
        display_name: user.nickname || '我',
        display_avatar: user.avatar_url || '',
        created_at: '刚刚',
        _pending: true,
      }],
      commentText: '',
      commentValid: false,
      submitting: true,
      post: this.data.post ? { ...this.data.post, comment_count: this.data.post.comment_count + 1 } : null,
    });

    api.addComment(this.postId, text).then(comment => {
      // 用真实数据替换临时评论
      this.setData({
        comments: this.data.comments.map(c => c._id === tempId ? { ...comment, _pending: false } : c),
        submitting: false,
      });
      wx.showToast({ title: '评论已发送', icon: 'success' });
    }).catch(e => {
      // 失败：移除临时评论，还原文字和计数
      this.setData({
        comments: this.data.comments.filter(c => c._id !== tempId),
        commentText: text,
        commentValid: true,
        submitting: false,
        post: this.data.post ? { ...this.data.post, comment_count: this.data.post.comment_count - 1 } : null,
      });
      wx.showToast({ title: e.message || '评论失败', icon: 'none' });
    });
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

  goUserProfile(e) {
    const { uid, anon } = e.currentTarget.dataset;
    if (!uid || anon) return;
    wx.navigateTo({ url: `/pages/user-profile/index?uid=${uid}` });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },
  goVerify() { wx.navigateTo({ url: '/pages/verify/index' }); },
});
