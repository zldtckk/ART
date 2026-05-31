const api = require('../../utils/api');
const auth = require('../../utils/auth');


Page({
  data: {
    studios: [],
    selectedStudioId: null,
    selectedStudioName: '',
    showStudioList: false,
    realName: '',
    className: '',
    studentIdImage: '',
    submitting: false,
    loading: true,
    verificationStatus: 'none',
    rejectionReason: '',
  },

  onLoad() {
    // 先用本地缓存快速渲染
    const cached = wx.getStorageSync('user') || {};
    this.setData({
      verificationStatus: cached.verification_status || 'none',
      rejectionReason: cached.rejection_reason || '',
    });
    // 再从云端拉最新状态
    api.getMyProfile().then(user => {
      if (!user) return;
      auth.setUser(user);
      this.setData({
        verificationStatus: user.verification_status || 'none',
        rejectionReason: user.rejection_reason || '',
      });
      if (user.verification_status === 'pending' || user.verification_status === 'approved') {
        this.setData({ loading: false });
        return;
      }
      return api.getStudios();
    }).then(studios => {
      if (studios) this.setData({ studios });
    }).catch(() => {}).finally(() => this.setData({ loading: false }));
  },

  goBack() { wx.navigateBack(); },

  toggleStudioList() {
    this.setData({ showStudioList: !this.data.showStudioList });
  },

  selectStudio(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    this.setData({ selectedStudioId: id, selectedStudioName: name, showStudioList: false });
  },

  onNameInput(e) { this.setData({ realName: e.detail.value }); },
  onClassInput(e) { this.setData({ className: e.detail.value }); },

  uploadStudentId() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'] }).then(res => {
      if (!res.tempFilePaths.length) return;
      this.setData({ studentIdImage: res.tempFilePaths[0] });
    }).catch(() => {});
  },

  async submit() {
    if (!this.data.selectedStudioId || !this.data.realName.trim()) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    this.setData({ submitting: true });
    try {
      let studentIdUrl = '';
      if (this.data.studentIdImage) {
        studentIdUrl = await api.uploadImage(this.data.studentIdImage);
      }
      const res = await api.submitVerification({
        studio_id: this.data.selectedStudioId,
        real_name: this.data.realName.trim(),
        class_name: this.data.className.trim(),
        student_id_url: studentIdUrl,
        method: 'student_id',
      });
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (e) {
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
