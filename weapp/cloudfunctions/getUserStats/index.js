const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  const [posts, comments, favorites] = await Promise.all([
    db.collection('posts').where({ _openid: openid }).count(),
    db.collection('comments').where({ _openid: openid }).count(),
    db.collection('favorites').where({ _openid: openid }).count(),
  ]);
  return {
    post_count: posts.total,
    comment_count: comments.total,
    favorite_count: favorites.total,
  };
};
