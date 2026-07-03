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
    return false;
  }
}

exports.main = async (event) => {
  const { postId, content, parent_comment_id, reply_to_user_id } = event;
  const openid = cloud.getWXContext().OPENID;

  if (!postId) return { code: -1, msg: '参数错误' };
  const text = (content || '').trim();
  if (!text) return { code: -1, msg: '评论不能为空' };
  if (text.length > MAX_LEN) return { code: -1, msg: '评论过长' };

  if (await checkText(text, openid)) return { code: -1, msg: '评论内容违规，请修改后重试' };

  // 校验帖子存在
  const postRes = await db.collection('posts').doc(postId).get().catch(() => null);
  if (!postRes || !postRes.data) return { code: -1, msg: '帖子不存在' };
  const post = postRes.data;

  // 如果是回复，校验被回复的评论存在
  if (parent_comment_id) {
    const parentComment = await db.collection('comments').doc(parent_comment_id).get().catch(() => null);
    if (!parentComment || !parentComment.data) return { code: -1, msg: '该评论已被删除' };
  }

  const data = {
    post_id: postId,
    content: text,
    _openid: openid,
    createTime: db.serverDate(),
  };
  if (parent_comment_id) data.parent_comment_id = parent_comment_id;
  if (reply_to_user_id) data.reply_to_user_id = reply_to_user_id;

  const res = await db.collection('comments').add({ data });

  // 原子递增评论数
  await db.collection('posts').doc(postId).update({ data: { comment_count: _.inc(1) } });

  // 通知逻辑
  if (parent_comment_id && reply_to_user_id && reply_to_user_id !== openid) {
    // 回复评论 → 通知被回复者
    await db.collection('notifications').add({
      data: {
        user_id: reply_to_user_id,
        type: 'comment_reply',
        title: '有人回复了你的评论',
        content: text.slice(0, 50),
        related_post_id: postId,
        is_read: false,
        createTime: db.serverDate(),
      },
    });
  } else if (!parent_comment_id && post._openid && post._openid !== openid) {
    // 顶级评论 → 通知帖子作者
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
