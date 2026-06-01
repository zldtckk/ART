const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { SYSTEM_AVATARS, avatarPath } = require('../../utils/constants');

Page({
  data: {
    avatars: SYSTEM_AVATARS.map(a => ({ ...a, path: avatarPath(a.key) })),
    currentAvatar: '',
    saving: false,
  },

  onLoad() {
    const user = auth.getAuth().user;
    this.setData({ currentAvatar: (user && user.avatar_url) || '' });
  },

  goBack() { wx.navigateBack(); },

  // 选择系统头像：即时保存
  selectSystem(e) {
    if (this.data.saving) return;
    const path = e.currentTarget.dataset.path;
    if (path === this.data.currentAvatar) { wx.navigateBack(); return; }
    this.applyAvatar(path);
  },

  // 上传自定义照片
  uploadCustom() {
    if (this.data.saving) return;
    wx.chooseImage({ count: 1, sizeType: ['compressed'] }).then(res => {
      if (!res.tempFilePaths.length) return;
      wx.showLoading({ title: '上传中' });
      api.uploadImage(res.tempFilePaths[0]).then(fileID => {
        wx.hideLoading();
        this.applyAvatar(fileID);
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      });
    }).catch(() => {});
  },

  applyAvatar(avatarUrl) {
    this.setData({ saving: true, currentAvatar: avatarUrl });
    const user = { ...auth.getAuth().user, avatar_url: avatarUrl };
    auth.setUser(user);
    api.updateUser({ avatar_url: avatarUrl }).then(() => {
      wx.showToast({ title: '头像已更新', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    }).catch(() => {
      this.setData({ saving: false });
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },
});
