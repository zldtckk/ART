const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    tab: 'verify',
    pendingList: [],
    studios: [],
    newStudioName: '',
    newStudioDistrict: '',
    loading: true,
    showRejectModal: false,
    rejectTargetId: null,
    rejectReason: '',
  },

  onLoad() {
    this.loadPending();
    this.loadStudios();
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }); },

  loadPending() {
    Promise.all([api.getPendingVerifications(), api.getStudios()]).then(([users, studios]) => {
      const studioMap = {};
      (studios || []).forEach(s => { studioMap[s._id] = s.name; studioMap[s.id] = s.name; });
      const list = (users || []).map(v => ({
        ...v,
        _displayName: v.real_name || v.nickname || '未知',
        _studioName: studioMap[v.studio_id] || v.studio_id || '未填写',
      }));
      this.setData({ pendingList: list, studios });
    }).catch(() => {}).finally(() => this.setData({ loading: false }));
  },

  loadStudios() {
    api.getStudios().then(studios => {
      this.setData({ studios });
    }).catch(() => {});
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url], current: url });
  },

  approve(e) {
    const id = e.currentTarget.dataset.id;
    api.approveVerification(id).then(() => {
      wx.showToast({ title: '已通过', icon: 'success' });
      this.setData({ pendingList: this.data.pendingList.filter(v => v.id !== id && v._id !== id) });
    }).catch(() => wx.showToast({ title: '操作失败', icon: 'none' }));
  },

  reject(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ showRejectModal: true, rejectTargetId: id, rejectReason: '' });
  },

  onRejectReasonInput(e) {
    this.setData({ rejectReason: e.detail.value });
  },

  cancelReject() {
    this.setData({ showRejectModal: false, rejectTargetId: null, rejectReason: '' });
  },

  confirmReject() {
    const { rejectTargetId, rejectReason } = this.data;
    if (!rejectReason.trim()) {
      wx.showToast({ title: '请填写拒绝原因', icon: 'none' });
      return;
    }
    this.setData({ showRejectModal: false });
    wx.showLoading({ title: '处理中' });
    api.rejectVerification(rejectTargetId, rejectReason.trim()).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '已拒绝', icon: 'success' });
      this.setData({ pendingList: this.data.pendingList.filter(v => v.id !== rejectTargetId && v._id !== rejectTargetId) });
    }).catch(() => { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'none' }); });
  },

  goBack() { wx.navigateBack(); },
  onStudioNameInput(e) { this.setData({ newStudioName: e.detail.value }); },
  onStudioDistrictInput(e) { this.setData({ newStudioDistrict: e.detail.value }); },

  addStudio() {
    if (!this.data.newStudioName.trim()) {
      wx.showToast({ title: '请输入画室名称', icon: 'none' });
      return;
    }
    api.addStudio(this.data.newStudioName.trim(), this.data.newStudioDistrict.trim()).then(() => {
      wx.showToast({ title: '添加成功', icon: 'success' });
      this.setData({ newStudioName: '', newStudioDistrict: '' });
      this.loadStudios();
    }).catch(() => wx.showToast({ title: '添加失败', icon: 'none' }));
  },
});
