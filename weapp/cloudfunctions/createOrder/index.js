const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const MAX_NOTE_LEN = 200;
const MAX_QTY = 50;

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;

  const userRes = await db.collection('users').where({ _openid: openid }).get();
  const user = userRes.data[0] || {};
  if (!user.is_verified) return { code: -2, msg: '仅认证画室学生可下单，请先完成认证' };

  const rawItems = Array.isArray(event.items) ? event.items : [];
  if (!rawItems.length) return { code: -1, msg: '购物车为空' };

  const dishIds = [...new Set(rawItems.map(i => i.dish_id).filter(Boolean))];
  if (!dishIds.length) return { code: -1, msg: '参数错误' };

  const dishesRes = await db.collection('sam_dishes').where({ _id: _.in(dishIds) }).get();
  const dishMap = {};
  dishesRes.data.forEach(d => { dishMap[d._id] = d; });

  const items = [];
  const skipped = [];
  const capped = [];
  for (const raw of rawItems) {
    const dish = dishMap[raw.dish_id];
    if (!dish || !dish.is_available) {
      skipped.push((dish && dish.name) || String(raw.name || '').trim() || '某商品');
      continue;
    }
    const requestedQty = parseInt(raw.qty, 10) || 1;
    const qty = Math.min(MAX_QTY, Math.max(1, requestedQty));
    if (requestedQty > MAX_QTY) capped.push(dish.name);
    items.push({
      dish_id: raw.dish_id,
      name: dish.name,
      price: dish.price,
      unit: dish.unit || '份',
      image: dish.image || '',
      qty,
    });
  }
  if (!items.length) return { code: -1, msg: '所选菜品已下架，请重新选择' };

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const note = String(event.note || '').trim().slice(0, MAX_NOTE_LEN);

  const doc = {
    _openid: openid,
    items,
    total,
    note,
    status: 'pending',
    buyer_name: user.nickname || (user.sys_user_id ? `用户${user.sys_user_id}` : '用户'),
    buyer_avatar: user.avatar_url || '',
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
  };

  const res = await db.collection('sam_orders').add({ data: doc });
  return { code: 0, order: { ...doc, _id: res._id }, skipped, capped };
};
