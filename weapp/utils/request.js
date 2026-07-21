const BASE_URL = 'https://art.msrtai.site';

function getToken() {
  return wx.getStorageSync('token') || '';
}

// 统一的 JSON 请求封装，替代原来的 wx.cloud.callFunction / wx.cloud.database()
function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          if (res.statusCode === 401) clearStaleSession();
          const err = new Error((res.data && res.data.msg) || '请求失败');
          err.code = res.data && res.data.code;
          err.statusCode = res.statusCode;
          reject(err);
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误'));
      },
    });
  });
}

// token过期/失效时后端返回401，这里顺手把本地残留的 user/token 缓存清掉，
// 避免 user 还在但 token 已失效的"假登录"状态一直卡住（每次操作都报未登录却不知道原因）。
function clearStaleSession() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('user');
  const app = getApp();
  if (app && app.globalData) app.globalData.user = null;
}

// 文件上传封装，替代原来的 wx.cloud.uploadFile
function uploadFile(path, filePath) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    wx.uploadFile({
      url: BASE_URL + path,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        let data;
        try {
          data = JSON.parse(res.data);
        } catch (e) {
          return reject(new Error('上传响应解析失败'));
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && data.code === 0) {
          resolve(data);
        } else {
          if (res.statusCode === 401) clearStaleSession();
          reject(new Error(data.msg || '上传失败'));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误'));
      },
    });
  });
}

function buildQuery(params) {
  const query = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return query ? `?${query}` : '';
}

module.exports = {
  get: (path, params) => request('GET', path + buildQuery(params)),
  post: (path, data) => request('POST', path, data),
  patch: (path, data) => request('PATCH', path, data),
  del: (path) => request('DELETE', path),
  uploadFile,
};
