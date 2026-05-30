const auth = require('../../utils/auth');

Page({
  data: { loading: false },

  async handleWxLogin() {
    this.setData({ loading: true });
    try {
      await auth.wxLogin();
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
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
