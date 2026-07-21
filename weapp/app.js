const { CITIES, DEFAULT_CITY } = require('./config/city');

App({
  globalData: {
    user: null,
    feedNeedsRefresh: false,
    pendingConvId: null,
    pendingPost: null,
    pendingBoard: null,
    currentCity: DEFAULT_CITY,
    cities: CITIES,
  },

  onLaunch() {
    const user = wx.getStorageSync('user');
    if (user) this.globalData.user = user;
    // 恢复上次选择的城市
    const savedCity = wx.getStorageSync('currentCity');
    if (savedCity && CITIES.some(c => c.slug === savedCity)) {
      this.globalData.currentCity = savedCity;
    }
  },

  setUser(user) {
    this.globalData.user = user;
    wx.setStorageSync('user', user);
  },

  logout() {
    this.globalData.user = null;
    wx.removeStorageSync('user');
  },

  setCurrentCity(slug) {
    if (!CITIES.some(c => c.slug === slug)) return;
    this.globalData.currentCity = slug;
    wx.setStorageSync('currentCity', slug);
  },

  getCurrentCity() {
    return this.globalData.currentCity || DEFAULT_CITY;
  },

  getCityName() {
    const city = CITIES.find(c => c.slug === this.globalData.currentCity);
    return city ? city.name : '杭州';
  },
});
