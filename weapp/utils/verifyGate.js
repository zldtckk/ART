// 统一处理「需要先完成认证」这类接口报错（后端 requireVerified 中间件返回 code:2）
function showVerifyModal(message) {
  wx.showModal({
    title: '需要先完成认证',
    content: message || '认证后才能使用这个功能，去认证一下吧',
    confirmText: '去认证',
    success: (res) => {
      if (res.confirm) wx.navigateTo({ url: '/pages/verify/index' });
    },
  });
}

// token失效时后端401，request.js已经顺手清了本地缓存，这里再引导用户重新登录，
// 而不是让他们对着一个"看起来登录了但操作总是失败"的界面摸不着头脑。
function showLoginModal(message) {
  wx.showModal({
    title: '登录已过期',
    content: message || '登录状态已失效，请重新登录',
    confirmText: '去登录',
    success: (res) => {
      if (res.confirm) wx.navigateTo({ url: '/pages/login/index' });
    },
  });
}

// 统一的接口报错兜底：code===2 弹认证引导，401弹重新登录，否则弹通用 toast
function handleApiError(e, fallbackTitle) {
  if (e && e.code === 2) {
    showVerifyModal(e.message);
    return true;
  }
  if (e && e.statusCode === 401) {
    showLoginModal(e.message);
    return true;
  }
  wx.showToast({ title: (e && e.message) || fallbackTitle || '操作失败', icon: 'none' });
  return false;
}

module.exports = { showVerifyModal, showLoginModal, handleApiError };
