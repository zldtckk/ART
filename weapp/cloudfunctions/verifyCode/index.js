const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { code } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!code) return { code: -1, msg: '请输入认证码' };

  const res = await db.collection('verification_codes')
    .where({ code, is_used: false })
    .get();

  if (res.data.length === 0) {
    return { code: -1, msg: '认证码无效或已被使用' };
  }

  const vc = res.data[0];

  // 标记认证码已使用
  await db.collection('verification_codes').doc(vc._id).update({
    data: { is_used: true },
  });

  // 更新用户信息
  await db.collection('users').where({ _openid: openid }).update({
    data: {
      studio_id: vc.studio_id,
      verification_status: 'approved',
      is_verified: true,
    },
  });

  return { code: 0, msg: '认证成功', studio_id: vc.studio_id };
};
