const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    user: null,
    nickname: '',
    avatarUrl: '',
    phone: '',
  },

  onShow() {
    const authData = auth.getAuth();
    this.setData({
      user: authData.user,
      nickname: authData.user && authData.user.nickname || '',
      avatarUrl: authData.user && authData.user.avatar_url || '',
      phone: authData.user && authData.user.phone || '',
    });
  },

  onNicknameInput(e) { this.setData({ nickname: e.detail.value }); },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },

  goAvatarPicker() {
    wx.navigateTo({ url: '/pages/avatar-picker/index' });
  },

  saveProfile() {
    api.updateUser({
      nickname: this.data.nickname.trim(),
      phone: this.data.phone.trim(),
    }).then(() => {
      const user = { ...this.data.user, nickname: this.data.nickname.trim(), phone: this.data.phone.trim() };
      auth.setUser(user);
      this.setData({ user });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    }).catch(() => wx.showToast({ title: '保存失败', icon: 'none' }));
  },

  goBack() { wx.navigateBack(); },
});
