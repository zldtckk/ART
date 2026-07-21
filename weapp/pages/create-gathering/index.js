const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { GATHERING_TYPES } = require('../../utils/constants');
const { handleApiError } = require('../../utils/verifyGate');

Page({
  data: {
    types: GATHERING_TYPES,
    gatherType: '',
    gatherTime: '',
    gatherPlace: '',
    gatherLimit: 4,
    content: '',
    gatherQr: '',
    submitting: false,
    step: 1, // 1=选类目 2=填信息
  },

  goBack() {
    if (this.data.step === 2) {
      this.setData({ step: 1 });
    } else {
      wx.navigateBack();
    }
  },

  selectType(e) {
    this.setData({ gatherType: e.currentTarget.dataset.key, step: 2 });
  },

  onTimeInput(e) { this.setData({ gatherTime: e.detail.value }); },
  onPlaceInput(e) { this.setData({ gatherPlace: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onLimitInput(e) {
    const v = parseInt(e.detail.value, 10);
    if (v >= 2 && v <= 50) this.setData({ gatherLimit: v });
  },

  async chooseQrCode() {
    try {
      const res = await wx.chooseImage({ count: 1, sizeType: ['original'] });
      wx.showLoading({ title: '上传中' });
      const fileID = await api.uploadQrCode(res.tempFilePaths[0]);
      wx.hideLoading();
      this.setData({ gatherQr: fileID });
      wx.showToast({ title: '上传成功', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  async submit() {
    if (!this.data.gatherTime.trim()) {
      wx.showToast({ title: '请填写时间', icon: 'none' }); return;
    }
    if (!this.data.gatherPlace.trim()) {
      wx.showToast({ title: '请填写地点', icon: 'none' }); return;
    }
    if (!this.data.content.trim()) {
      wx.showToast({ title: '请写点描述', icon: 'none' }); return;
    }
    if (!this.data.gatherQr) {
      wx.showToast({ title: '请上传你的微信二维码', icon: 'none' }); return;
    }
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' }); return;
    }
    this.setData({ submitting: true });
    try {
      await api.createPost({
        board: 'gathering',
        content: this.data.content.trim(),
        images: [],
        is_anonymous: false,
        is_gathering: true,
        gather_type: this.data.gatherType,
        gather_time: this.data.gatherTime.trim(),
        gather_place: this.data.gatherPlace.trim(),
        gather_limit: this.data.gatherLimit,
        gather_qr: this.data.gatherQr,
        gather_count: 1,
      });
      wx.showToast({ title: '发起成功！', icon: 'success' });
      getApp().globalData.feedNeedsRefresh = true;
      setTimeout(() => {
        wx.switchTab({ url: '/pages/gatherings/index' });
      }, 800);
    } catch (e) {
      handleApiError(e, '发起失败');
    } finally {
      this.setData({ submitting: false });
    }
  },
});
