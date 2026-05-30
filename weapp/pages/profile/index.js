const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    user: null,
    isLoggedIn: false,
    postCount: 0,
    commentCount: 0,
    favoriteCount: 0,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    const authData = auth.getAuth();
    this.setData({ user: authData.user, isLoggedIn: authData.isLoggedIn });
    if (authData.isLoggedIn) {
      this.loadCounts();
      this.refreshUser();
    }
  },

  async refreshUser() {
    try {
      const user = await api.getMyProfile();
      if (!user) return;
      // Fetch studio name if user has studio_id
      if (user.studio_id && !user.studio_name) {
        try {
          const studios = await api.getStudios();
          const studio = studios.find(s => s.id === user.studio_id || s._id === user.studio_id);
          if (studio) user.studio_name = studio.name;
        } catch (e) { /* ignore */ }
      }
      auth.setUser(user);
      this.setData({ user });
    } catch (e) { /* ignore */ }
  },

  loadCounts() {
    api.getUserStats().then(stats => {
      this.setData({
        postCount: stats.post_count || 0,
        commentCount: stats.comment_count || 0,
        favoriteCount: stats.favorite_count || 0,
      });
    }).catch(() => {});
  },

  goLogin() { wx.navigateTo({ url: '/pages/login/index' }); },
  goSettings() { wx.navigateTo({ url: '/pages/settings/index' }); },
  goMyPosts() { wx.navigateTo({ url: '/pages/my-posts/index' }); },
  goMyComments() { wx.navigateTo({ url: '/pages/my-comments/index' }); },
  goMyFavorites() { wx.navigateTo({ url: '/pages/my-favorites/index' }); },
  goVerify() { wx.navigateTo({ url: '/pages/verify/index' }); },
  goAdmin() { wx.navigateTo({ url: '/pages/admin-verify/index' }); },

  async becomeAdmin() {
    wx.showLoading({ title: '设置中' });
    try {
      const user = await api.becomeAdmin();
      if (user) {
        auth.setUser(user);
        this.setData({ user });
        wx.hideLoading();
        wx.showToast({ title: '已设为圈主', icon: 'success' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '设置失败', icon: 'none' });
    }
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录？',
      success: (res) => {
        if (res.confirm) {
          auth.logout();
          this.setData({ user: null, isLoggedIn: false, postCount: 0, commentCount: 0, favoriteCount: 0 });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      },
    });
  },
});
