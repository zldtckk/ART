const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { postId } = event;
  if (!postId) return { code: -1, msg: '参数错误' };

  try {
    await db.collection('posts').doc(postId).update({
      data: { view_count: _.inc(1) },
    });
    return { code: 0 };
  } catch (e) {
    // 帖子不存在或已删除，静默忽略
    return { code: -1, msg: e.message };
  }
};
