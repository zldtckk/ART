const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admins').where({ openid }).count();
  return res.total > 0;
}

exports.main = async (event) => {
  const { name, district } = event;
  const openid = cloud.getWXContext().OPENID;

  if (!(await isAdmin(openid))) return { code: -1, msg: '仅管理员可操作' };

  if (!name || !name.trim()) return { code: -1, msg: '请输入画室名称' };

  const trimmedName = name.trim();
  const trimmedDistrict = (district || '').trim();

  // 检查同城市是否已存在同名画室
  const city = event.city || 'hangzhou';
  const existing = await db.collection('studios').where({ name: trimmedName, city }).get();
  if (existing.data.length > 0) return { code: -1, msg: '该画室已存在' };

  const res = await db.collection('studios').add({
    data: {
      name: trimmedName,
      district: trimmedDistrict,
      city,
      description: '',
      cover_url: '',
      createTime: db.serverDate(),
    },
  });

  return { code: 0, studio: { _id: res._id, name: trimmedName, district: trimmedDistrict, city } };
};
