const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const MAX_LEN = 2000;

async function checkText(content, openid) {
  try {
    const res = await cloud.openapi.security.msgSecCheck({ content, version: 2, scene: 1, openid });
    return res.result && res.result.suggest === 'risky';
  } catch (e) {
    return false;
  }
}

exports.main = async (event) => {
  const { board, content, images, is_anonymous, circle_type, market_tag, market_category, price } = event;
  const openid = cloud.getWXContext().OPENID;

  const text = (content || '').trim();
  if (!text) return { code: -1, msg: '内容不能为空' };
  if (text.length > MAX_LEN) return { code: -1, msg: '内容过长' };
  if (!board) return { code: -1, msg: '参数错误' };

  if (await checkText(text, openid)) return { code: -1, msg: '内容违规，请修改后重试' };

  // 读取发帖人资料补充 studio_id
  const userRes = await db.collection('users').where({ _openid: openid }).get();
  const user = userRes.data[0] || {};

  const doc = {
    board,
    content: text,
    _openid: openid,
    images: images || [],
    is_anonymous: !!is_anonymous,
    is_public: true,
    like_count: 0,
    comment_count: 0,
    favorite_count: 0,
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
  };
  if (user.studio_id) doc.studio_id = user.studio_id;
  if (board === 'circle' && circle_type) doc.circle_type = circle_type;
  if (board === 'market') {
    if (market_tag) doc.market_tag = market_tag;
    if (market_category) doc.market_category = market_category;
    if (price != null && price !== '') doc.price = parseFloat(price);
  }

  const res = await db.collection('posts').add({ data: doc });
  return { code: 0, post: { ...doc, _id: res._id } };
};
