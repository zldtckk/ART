const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const MAX_LEN = 500;

async function checkText(content, openid) {
  try {
    const res = await cloud.openapi.security.msgSecCheck({ content, version: 2, scene: 1, openid });
    return res.result && res.result.suggest === 'risky';
  } catch (e) {
    return false; // 检测接口异常时放行，不影响正常使用
  }
}

exports.main = async (event) => {
  const { postId, content } = event;
  const openid = cloud.getWXContext().OPENID;

  if (!postId) return { code: -1, msg: '参数错误' };
  const text = (content || '').trim();
  if (!text) return { code: -1, msg: '评论不能为空' };
  if (text.length > MAX_LEN) return { code: -1, msg: '评论过长' };

  if (await checkText(text, openid)) return { code: -1, msg: '评论内容违规，请修改后重试' };

  // 校验帖子存在，避免孤儿评论
  const postRes = await db.collection('posts').doc(postId).get().catch(() => null);
  if (!postRes || !postRes.data) return { code: -1, msg: '帖子不存在' };

  const data = {
    post_id: postId,
    content: text,
    _openid: openid,
    createTime: db.serverDate(),
  };
  const res = await db.collection('comments').add({ data });

  // 云函数有管理员写权限，可更新他人帖子的评论数
  await db.collection('posts').doc(postId).update({ data: { comment_count: _.inc(1) } });

  // 给帖子作者发评论通知（非自己评论自己时）
  const post = postRes.data;
  if (post._openid && post._openid !== openid) {
    await db.collection('notifications').add({
      data: {
        user_id: post._openid,
        type: 'comment',
        title: '收到新评论',
        content: text.slice(0, 50),
        related_post_id: postId,
        is_read: false,
        createTime: db.serverDate(),
      },
    });
  }

  return { code: 0, comment: { ...data, _id: res._id } };
};
