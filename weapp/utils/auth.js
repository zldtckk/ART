const db = wx.cloud.database();

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
  getApp().logout();
}

async function wxLogin() {
  const res = await wx.cloud.callFunction({ name: 'login' });
  if (res.result && res.result.user) {
    setUser(res.result.user);
  }
  return res.result;
}

function getUserProfile() {
  return getApp().globalData.user;
}

function isLoggedIn() {
  return !!getApp().globalData.user;
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
