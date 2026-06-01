const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admins').where({ openid }).count();
  return res.total > 0;
}

exports.main = async (event) => {
  const { postId } = event;
  const openid = cloud.getWXContext().OPENID;
  if (!postId) return { code: -1, msg: '参数错误' };

  const postRes = await db.collection('posts').doc(postId).get().catch(() => null);
  if (!postRes || !postRes.data) return { code: -1, msg: '帖子不存在' };

  // 仅作者本人或管理员可删
  if (postRes.data._openid !== openid && !(await isAdmin(openid))) {
    return { code: -1, msg: '无权限' };
  }

  // 云函数有管理员写权限，可一次删净所有用户的关联数据
  await db.collection('posts').doc(postId).remove();
  await db.collection('comments').where({ post_id: postId }).remove();
  await db.collection('likes').where({ post_id: postId }).remove();
  await db.collection('favorites').where({ post_id: postId }).remove();

  return { code: 0 };
};
