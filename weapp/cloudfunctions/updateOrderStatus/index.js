const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const VALID_STATUS = ['pending', 'done', 'cancelled'];

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admins').where({ openid }).count();
  return res.total > 0;
}

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  if (!(await isAdmin(openid))) return { code: -1, msg: '仅管理员可操作' };

  const { id, status } = event;
  if (!id || !VALID_STATUS.includes(status)) return { code: -1, msg: '参数错误' };

  await db.collection('sam_orders').doc(id).update({ data: { status, updateTime: db.serverDate() } });
  return { code: 0 };
};
