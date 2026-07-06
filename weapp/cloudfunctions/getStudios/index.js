const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const city = event.city;
    let query = db.collection('studios');
    if (city) {
      query = query.where({ city });
    }
    const res = await query.orderBy('name', 'asc').get();
    return { code: 0, studios: res.data };
  } catch (e) {
    return { code: -1, msg: e.message, studios: [] };
  }
};
