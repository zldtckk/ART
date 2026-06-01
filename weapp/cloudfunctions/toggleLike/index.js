const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { postId } = event;
  const openid = cloud.getWXContext().OPENID;

  const existing = await db.collection('likes')
    .where({ post_id: postId, _openid: openid })
    .get();

  const wasLiked = existing.data.length > 0;

  if (wasLiked) {
    await db.collection('likes').doc(existing.data[0]._id).remove();
    await db.collection('posts').doc(postId).update({ data: { like_count: _.inc(-1) } });
  } else {
    await db.collection('likes').add({
      data: { post_id: postId, _openid: openid, createTime: db.serverDate() },
    });
    await db.collection('posts').doc(postId).update({ data: { like_count: _.inc(1) } });
  }

  // 读回真实值（含 Math.max 防止历史脏数据出现负数）
  const postDoc = await db.collection('posts').doc(postId).get();
  const likeCount = Math.max(0, postDoc.data.like_count || 0);

  // 如果脏数据导致 count 和实际不符，直接修正（可选，首次运行修复历史数据）
  if (postDoc.data.like_count < 0) {
    await db.collection('posts').doc(postId).update({ data: { like_count: 0 } });
  }

  return { liked: !wasLiked, like_count: likeCount };
};
