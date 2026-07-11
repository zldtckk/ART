const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admins').where({ openid }).count();
  return res.total > 0;
}

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  if (!(await isAdmin(openid))) return { code: -1, msg: '仅管理员可操作' };

  const { action, id } = event;

  if (action === 'list') {
    const res = await db.collection('sam_dishes').orderBy('sort', 'asc').orderBy('createTime', 'desc').limit(200).get();
    return { code: 0, dishes: res.data };
  }

  if (action === 'create') {
    const name = (event.name || '').trim();
    const price = parseFloat(event.price);
    if (!name) return { code: -1, msg: '请输入菜品名称' };
    if (!(price >= 0)) return { code: -1, msg: '请输入有效价格' };

    const doc = {
      name,
      price,
      unit: (event.unit || '份').trim(),
      image: event.image || '',
      is_available: true,
      sort: parseInt(event.sort, 10) || 0,
      _openid: openid,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    };
    const res = await db.collection('sam_dishes').add({ data: doc });
    return { code: 0, dish: { ...doc, _id: res._id } };
  }

  if (action === 'update') {
    if (!id) return { code: -1, msg: '参数错误' };
    const update = { updateTime: db.serverDate() };
    if (event.name != null) update.name = String(event.name).trim();
    if (event.price != null) update.price = parseFloat(event.price);
    if (event.unit != null) update.unit = String(event.unit).trim();
    if (event.image != null) update.image = event.image;
    if (event.sort != null) update.sort = parseInt(event.sort, 10) || 0;
    if (event.is_available != null) update.is_available = !!event.is_available;
    await db.collection('sam_dishes').doc(id).update({ data: update });
    return { code: 0 };
  }

  if (action === 'delete') {
    if (!id) return { code: -1, msg: '参数错误' };
    await db.collection('sam_dishes').doc(id).remove();
    return { code: 0 };
  }

  return { code: -1, msg: '未知操作' };
};
