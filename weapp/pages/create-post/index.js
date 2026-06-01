const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { BOARDS, CIRCLE_TYPES, FAN_TYPES, MARKET_CATEGORIES, MARKET_TAGS } = require('../../utils/constants');

Page({
  data: {
    boards: [],
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
    const boards = BOARDS.map((b) => ({
      ...b,
      name: b.key === 'circle' ? '画室圈子' : b.key === 'fan' ? '爱豆专区' : b.name,
    }));
    this.setData({ boards });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
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
    this.setData({
      circleType: key,
      isAnonymous: key === 'treehole',
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
        if (img.startsWith('cloud://')) {
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
        is_anonymous: this.data.isAnonymous,
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
      wx.showToast({ title: e.message || '发布失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goBack() { wx.navigateBack(); },
});
