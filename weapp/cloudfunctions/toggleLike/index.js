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

  return { liked: !wasLiked };
};
