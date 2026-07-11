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
    replyingTo: null,
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
    if (this.postId) {
      // 去重：同用户同帖子 30 分钟内不重复计数
      const key = 'viewed_' + this.postId;
      const lastViewed = wx.getStorageSync(key);
      const now = Date.now();
      if (!lastViewed || now - lastViewed > 30 * 60 * 1000) {
        wx.setStorageSync(key, now);
        api.incrementViewCount(this.postId);
        this._newView = true;
      }
      this.loadPost();
    } else {
      wx.navigateBack();
    }
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
        if (post.is_gathering) {
          const gatherTypeMap = { food: '约饭', play: '约玩', walk: '约逛', photo: '约拍', other: '其他' };
          post.gather_type_name = gatherTypeMap[post.gather_type] || '攒局';
          const expireTime = new Date(post.createTime).getTime() + 7 * 24 * 60 * 60 * 1000;
          const isFull = post.gather_count >= post.gather_limit;
          post.gather_closed = Date.now() > expireTime || isFull;
          post.gather_progress = Math.min(100, Math.round((post.gather_count / post.gather_limit) * 100));
          // 检查当前用户是否已报名
          const openid = getApp().globalData.user && getApp().globalData.user._openid;
          if (openid) {
            const joinRes = await api.db.collection('gatherings')
              .where({ post_id: this.postId, _openid: openid }).get().catch(() => ({ data: [] }));
            post.is_joined = joinRes.data.length > 0;
          }
        }
      }
      // 本次是新访问，乐观 +1 显示（云端已异步递增）
      if (this._newView && post) {
        post.view_count = (post.view_count || 0) + 1;
        this._newView = false;
      }
      const user = auth.getAuth().user;
      this.setData({
        post,
        comments: comments || [],
        isSelf: post && user && post._openid === user._openid,
        loading: false,
      });
    } catch (e) {
      wx.showToast({ title: '帖子不存在', icon: 'none' });
      wx.navigateBack();
    }
  },

  async handleJoin() {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    const post = this.data.post;
    if (!post || post.gather_closed) return;
    const wasJoined = post.is_joined;
    const delta = wasJoined ? -1 : 1;
    this.setData({
      post: { ...post, is_joined: !wasJoined, gather_count: post.gather_count + delta },
    });
    try {
      await api.joinGathering(this.postId);
      wx.showToast({ title: wasJoined ? '已取消报名' : '报名成功', icon: 'success' });
    } catch (e) {
      this.setData({ post: { ...this.data.post, is_joined: wasJoined, gather_count: post.gather_count } });
      if (e.code === 2) {
        wx.showModal({
          title: '需要先完成认证',
          content: e.message,
          confirmText: '去认证',
          success: (res) => {
            if (res.confirm) wx.navigateTo({ url: '/pages/verify/index' });
          },
        });
      } else {
        wx.showToast({ title: e.message || '操作失败', icon: 'none' });
      }
    }
  },

  async handleReplaceQr() {
    try {
      const res = await wx.chooseImage({ count: 1, sizeType: ['original'] });
      wx.showLoading({ title: '上传中' });
      const fileID = await api.uploadQrCode(res.tempFilePaths[0]);
      await api.db.collection('posts').doc(this.postId).update({ data: { gather_qr: fileID } });
      wx.hideLoading();
      this.setData({ post: { ...this.data.post, gather_qr: fileID } });
      wx.showToast({ title: '二维码已更新', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
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
    // 输入框清空时取消回复状态
    if (!val && this.data.replyingTo) {
      this.setData({ replyingTo: null });
    }
  },

  onReply(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({
      replyingTo: { commentId: id, name },
      commentText: '',
      commentValid: false,
    });
    // 聚焦输入框
  },

  cancelReply() {
    this.setData({ replyingTo: null, commentText: '' });
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
    const replyTarget = this.data.replyingTo;

    // 乐观插入
    const tempComment = {
      _id: tempId,
      id: tempId,
      content: text,
      display_name: user.nickname || '我',
      display_avatar: user.avatar_url || '',
      created_at: '刚刚',
      _pending: true,
    };
    if (replyTarget) {
      tempComment.parent_comment_id = replyTarget.commentId;
      tempComment.reply_to_name = replyTarget.name;
    }

    this.setData({
      comments: [...this.data.comments, tempComment],
      commentText: '',
      commentValid: false,
      submitting: true,
      replyingTo: null,
      post: this.data.post ? { ...this.data.post, comment_count: this.data.post.comment_count + 1 } : null,
    });

    const addOpts = {};
    if (replyTarget) {
      addOpts.parentCommentId = replyTarget.commentId;
      // 从被回复的评论中找到它的作者 openid
      const parentComment = this.data.comments.find(c => c._id === replyTarget.commentId || c.id === replyTarget.commentId);
      if (parentComment) {
        addOpts.replyToUserId = parentComment.user_id || parentComment._openid;
      }
    }

    api.addComment(this.postId, text, addOpts).then(comment => {
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
    const { uid } = e.currentTarget.dataset;
    if (!uid) return;
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
