const request = require('./request');

function getAuth() {
  const app = getApp();
  const user = app.globalData.user;
  return {
    isLoggedIn: !!user,
    user: user || null,
  };
}

function setUser(user) {
  getApp().setUser(user);
}

function logout() {
  wx.removeStorageSync('token');
  getApp().logout();
}

function wxLoginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => (res.code ? resolve(res.code) : reject(new Error('获取登录凭证失败'))),
      fail: (err) => reject(new Error(err.errMsg || '微信登录失败')),
    });
  });
}

// 原来云函数免费拿 openid，自建后端要先 wx.login() 换 code，再拿 code 换 token
async function wxLogin() {
  const code = await wxLoginCode();
  const result = await request.post('/auth/login', { code });
  if (result.token) {
    wx.setStorageSync('token', result.token);
    // 补上 _openid 别名，页面里大量用 user._openid 做「是不是我自己」的判断
    const user = { ...result.user, _openid: result.user.openid };
    setUser(user);
    result.user = user;
  }
  return result;
}

function getUserProfile() {
  return getApp().globalData.user;
}

// user 和 token 是两个独立的 storage key（登录时一起写，但只有 token 有30天过期时间）。
// 之前这里只检查 user，导致 token 过期/丢失后 user 缓存还在，UI 显示"已登录"，
// 但一旦触发需要鉴权的操作（如报名攒局）后端会拒绝、提示"未登录"，用户却看不出哪里错了。
// 这里改成两者都要有效才算已登录，配合 request.js 里 401 时自动清理，避免这种"假登录"状态卡住。
function isLoggedIn() {
  return !!getApp().globalData.user && !!wx.getStorageSync('token');
}

function init() {
  const user = wx.getStorageSync('user');
  if (user) {
    getApp().globalData.user = user;
  }
  return { user };
}

module.exports = {
  getAuth,
  setUser,
  logout,
  wxLogin,
  getUserProfile,
  isLoggedIn,
  init,
};
