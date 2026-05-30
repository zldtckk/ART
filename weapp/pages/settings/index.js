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

  uploadAvatar() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'] }).then(res => {
      if (!res.tempFilePaths.length) return;
      wx.showLoading({ title: '上传中' });
      api.uploadImage(res.tempFilePaths[0]).then(fileID => {
        this.setData({ avatarUrl: fileID });
        const user = { ...this.data.user, avatar_url: fileID };
        auth.setUser(user);
        this.setData({ user });
        // Persist to database
        api.updateUser({ avatar_url: fileID }).catch(() => {});
        wx.hideLoading();
        wx.showToast({ title: '头像已更新', icon: 'success' });
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      });
    }).catch(() => {});
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
