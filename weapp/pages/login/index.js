const auth = require('../../utils/auth');

Page({
  data: { loading: false },

  async handleWxLogin() {
    this.setData({ loading: true });
    try {
      const result = await auth.wxLogin();
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        const user = result && result.user;
        if (user && !user.nickname) {
          wx.redirectTo({ url: '/pages/settings/index' });
        } else {
          wx.navigateBack();
        }
      }, 800);
    } catch (e) {
      wx.showToast({ title: e.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
