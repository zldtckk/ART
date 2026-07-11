const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  try {
    const res = await db.collection('sam_dishes')
      .where({ is_available: true })
      .orderBy('sort', 'asc')
      .orderBy('createTime', 'desc')
      .limit(100)
      .get();
    return { code: 0, dishes: res.data };
  } catch (e) {
    return { code: -1, msg: e.message, dishes: [] };
  }
};
