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
  const { board, content, images, is_anonymous, city, circle_type, market_tag, market_category, price,
    is_gathering, gather_type, gather_time, gather_place, gather_limit, gather_qr, gather_count } = event;
  const openid = cloud.getWXContext().OPENID;

  const text = (content || '').trim();
  if (!text) return { code: -1, msg: '内容不能为空' };
  if (text.length > MAX_LEN) return { code: -1, msg: '内容过长' };
  if (!board) return { code: -1, msg: '参数错误' };

  if (await checkText(text, openid)) return { code: -1, msg: '内容违规，请修改后重试' };

  const userRes = await db.collection('users').where({ _openid: openid }).get();
  const user = userRes.data[0] || {};

  // 攒局页(create-gathering)直接传 board:'gathering'；旧的发帖页攒局开关传 is_gathering，两种都认
  const isGatheringPost = board === 'gathering' || !!is_gathering;

  if (isGatheringPost && !user.is_verified) {
    return { code: -2, msg: '仅认证画室学生可发起攒局，请先完成认证' };
  }

  const finalBoard = isGatheringPost ? 'gathering' : board;

  const doc = {
    board: finalBoard,
    content: text,
    city: city || 'hangzhou',
    _openid: openid,
    images: images || [],
    is_anonymous: false,
    is_public: true,
    like_count: 0,
    comment_count: 0,
    favorite_count: 0,
    view_count: 0,
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
  };
  if (user.studio_id) doc.studio_id = user.studio_id;
  if (finalBoard === 'circle' && circle_type) doc.circle_type = circle_type;
  if (finalBoard === 'market') {
    if (market_tag) doc.market_tag = market_tag;
    if (market_category) doc.market_category = market_category;
    if (price != null && price !== '') doc.price = parseFloat(price);
  }
  if (isGatheringPost) {
    doc.is_gathering = true;
    doc.gather_type = gather_type || 'other';
    doc.gather_time = gather_time || '';
    doc.gather_place = gather_place || '';
    doc.gather_limit = parseInt(gather_limit, 10) || 4;
    doc.gather_count = gather_count || 1;
    if (gather_qr) doc.gather_qr = gather_qr;
  }

  const res = await db.collection('posts').add({ data: doc });
  return { code: 0, post: { ...doc, _id: res._id } };
};
