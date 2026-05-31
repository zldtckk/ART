App({
  globalData: {
    user: null,
    feedNeedsRefresh: false,
  },

  onLaunch() {
    wx.cloud.init({
      env: 'cloud1-d5ggpvn6l40fbefe9',
      traceUser: true,
    });
    const user = wx.getStorageSync('user');
    if (user) this.globalData.user = user;
  },

  setUser(user) {
    this.globalData.user = user;
    wx.setStorageSync('user', user);
  },

  logout() {
    this.globalData.user = null;
    wx.removeStorageSync('user');
  },
});
