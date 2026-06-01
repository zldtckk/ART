const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 查找已有用户
  const existing = await db.collection('users').where({ _openid: openid }).get();
  if (existing.data.length > 0) {
    return { user: existing.data[0] };
  }

  // 新用户随机分配一个生肖系统头像
  const ZODIAC = ['rat','ox','tiger','rabbit','dragon','snake','horse','goat','monkey','rooster','dog','pig'];
  const pick = ZODIAC[Math.floor(Math.random() * ZODIAC.length)];

  // 新建用户
  const user = {
    _openid: openid,
    role: 'student',
    is_verified: false,
    verification_status: 'none',
    avatar_url: `/assets/avatars/${pick}.png`,
    createTime: db.serverDate(),
  };
  await db.collection('users').add({ data: user });
  return { user };
};
