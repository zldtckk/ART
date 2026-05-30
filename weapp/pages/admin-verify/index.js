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
  },

  onLoad() {
    this.loadPending();
    this.loadStudios();
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }); },

  loadPending() {
    api.getPendingVerifications().then(users => {
      const list = (users || []).map(v => ({
        ...v,
        _displayName: v.real_name || v.nickname || '',
      }));
      this.setData({ pendingList: list });
    }).catch(() => {}).finally(() => this.setData({ loading: false }));
  },

  loadStudios() {
    api.getStudios().then(studios => {
      this.setData({ studios });
    }).catch(() => {});
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
    api.rejectVerification(id).then(() => {
      wx.showToast({ title: '已拒绝', icon: 'success' });
      this.setData({ pendingList: this.data.pendingList.filter(v => v.id !== id && v._id !== id) });
    }).catch(() => wx.showToast({ title: '操作失败', icon: 'none' }));
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
