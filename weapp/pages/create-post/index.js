const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { BOARDS, CIRCLE_TYPES, FAN_TYPES, MARKET_CATEGORIES, MARKET_TAGS } = require('../../utils/constants');
const { handleApiError } = require('../../utils/verifyGate');

Page({
  data: {
    boards: BOARDS.map(b => ({
      ...b,
      name: b.key === 'circle' ? '艺考圈子' : b.key === 'fan' ? '爱豆专区' : b.name,
    })),
    selectedBoard: 'circle',
    content: '',
    images: [],
    isAnonymous: false,
    circleType: 'general',
    fanType: 'share',
    idolTag: '',
    price: '',
    marketTag: 'sell',
    marketCategory: 'art_supplies',
    submitting: false,
    circleTypes: CIRCLE_TYPES,
    fanTypes: FAN_TYPES,
    marketCategories: MARKET_CATEGORIES,
    marketTags: MARKET_TAGS,
    showBoardPicker: false,
    showTypePicker: false,
  },

  onLoad(options) {
    if (options.board) this.setData({ selectedBoard: options.board });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    // 发帖是 tabBar 页，wx.navigateTo 打不进来（小程序不允许 navigateTo 到 tabBar 页），
    // 只能用 wx.switchTab，但 switchTab 不传 query 给 onLoad，且 onLoad 只在首次进入时跑一次。
    // 所以从 AI 测分等页面"分享到画室圈"时，用 globalData 暂存待发内容，这里在 onShow（每次切到这个 tab 都会触发）里消费掉。
    const pending = getApp().globalData.pendingPost;
    if (pending) {
      getApp().globalData.pendingPost = null;
      this.setData({
        content: pending.content || '',
        images: pending.imageUrl ? [pending.imageUrl] : [],
      });
    }
    const pendingBoard = getApp().globalData.pendingBoard;
    if (pendingBoard) {
      getApp().globalData.pendingBoard = null;
      this.setData({ selectedBoard: pendingBoard });
    }
  },

  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onPriceInput(e) { this.setData({ price: e.detail.value }); },
  onIdolTagInput(e) { this.setData({ idolTag: e.detail.value }); },
  selectFanType(e) { this.setData({ fanType: e.currentTarget.dataset.key }); },

  toggleAnonymous() {
    this.setData({ isAnonymous: !this.data.isAnonymous });
  },

  selectBoard(e) {
    this.setData({ selectedBoard: e.currentTarget.dataset.board, showBoardPicker: false });
  },

  selectCircleType(e) {
    const key = e.currentTarget.dataset.key;
    const types = this.data.circleTypes;
    const selected = types.find(t => t.key === key) || {};
    this.setData({
      circleType: key,
      circleTypeHint: selected.hint || '',
      isAnonymous: false,
      showTypePicker: false,
    });
  },

  selectMarketTag(e) { this.setData({ marketTag: e.currentTarget.dataset.key }); },
  selectMarketCategory(e) { this.setData({ marketCategory: e.currentTarget.dataset.key }); },

  chooseImage() {
    const remaining = 9 - this.data.images.length;
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' });
      return;
    }
    wx.chooseImage({ count: remaining, sizeType: ['compressed'] }).then((res) => {
      this.setData({ images: this.data.images.concat(res.tempFilePaths).slice(0, 9) });
    }).catch(() => {});
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images.filter((_, i) => i !== index);
    this.setData({ images });
  },

  async submit() {
    if (!this.data.content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    this.setData({ submitting: true });
    try {
      const imageUrls = [];
      for (const img of this.data.images) {
        if (img.startsWith('cloud://') || img.startsWith('http')) {
          // 已经是可访问的远程URL（如从AI测分分享过来的图），不用再上传一次
          imageUrls.push(img);
        } else {
          try {
            const fileID = await api.uploadImage(img);
            imageUrls.push(fileID);
          } catch (e) { /* ignore */ }
        }
      }

      const postData = {
        board: this.data.selectedBoard,
        content: this.data.content.trim(),
        images: imageUrls,
        is_anonymous: false,
      };

      if (this.data.selectedBoard === 'circle') {
        postData.circle_type = this.data.circleType;
      } else if (this.data.selectedBoard === 'fan') {
        postData.fan_type = this.data.fanType;
        if (this.data.idolTag.trim()) postData.idol_tag = this.data.idolTag.trim();
      } else if (this.data.selectedBoard === 'market') {
        postData.market_tag = this.data.marketTag;
        postData.market_category = this.data.marketCategory;
        if (this.data.price) postData.price = parseFloat(this.data.price);
      }

      await api.createPost(postData);
      // 重置表单
      this.setData({ content: '', images: [], price: '', isAnonymous: false, circleType: 'general', fanType: 'share', idolTag: '', marketTag: 'sell', marketCategory: 'art_supplies' });
      wx.showToast({ title: '发布成功', icon: 'success' });
      getApp().globalData.feedNeedsRefresh = true;
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 800);
    } catch (e) {
      handleApiError(e, '发布失败');
    } finally {
      this.setData({ submitting: false });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },
});
