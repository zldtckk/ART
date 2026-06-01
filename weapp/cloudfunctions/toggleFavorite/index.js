const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { postId } = event;
  const openid = cloud.getWXContext().OPENID;

  const existing = await db.collection('favorites')
    .where({ post_id: postId, _openid: openid })
    .get();

  if (existing.data.length > 0) {
    await Promise.all(existing.data.map(d => db.collection('favorites').doc(d._id).remove()));
    await db.collection('posts').doc(postId).update({
      data: { favorite_count: _.inc(-existing.data.length) },
    });
    return { favorited: false };
  }

  await db.collection('favorites').add({
    data: { post_id: postId, _openid: openid, createTime: db.serverDate() },
  });
  await db.collection('posts').doc(postId).update({ data: { favorite_count: _.inc(1) } });
  return { favorited: true };
};
