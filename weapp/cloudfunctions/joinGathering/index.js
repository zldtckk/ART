const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { postId } = event;
  if (!postId) return { code: 1, msg: '参数错误' };

  // 校验用户已认证
  const userRes = await db.collection('users').where({ _openid: OPENID }).get();
  const user = userRes.data[0];
  if (!user || user.verification_status !== 'approved') {
    return { code: 2, msg: '请先完成画室认证' };
  }

  // 获取帖子
  const postRes = await db.collection('posts').doc(postId).get().catch(() => null);
  if (!postRes) return { code: 3, msg: '帖子不存在' };
  const post = postRes.data;
  if (!post.is_gathering) return { code: 4, msg: '非攒局帖' };

  // 校验未过期
  const expireTime = new Date(post.createTime).getTime() + 7 * 24 * 60 * 60 * 1000;
  if (Date.now() > expireTime) return { code: 5, msg: '该局已过期' };

  // 查是否已报名
  const joinRes = await db.collection('gatherings').where({ post_id: postId, _openid: OPENID }).get();
  const alreadyJoined = joinRes.data.length > 0;

  if (alreadyJoined) {
    // 取消报名
    await db.collection('gatherings').doc(joinRes.data[0]._id).remove();
    await db.collection('posts').doc(postId).update({ data: { gather_count: _.increment(-1) } });
    return { code: 0, action: 'cancel' };
  }

  // 校验未满员
  if (post.gather_count >= post.gather_limit) return { code: 6, msg: '该局已满员' };

  // 报名
  await db.collection('gatherings').add({
    data: { post_id: postId, _openid: OPENID, createTime: db.serverDate() },
  });
  await db.collection('posts').doc(postId).update({ data: { gather_count: _.increment(1) } });

  // 通知发起人
  if (post._openid !== OPENID) {
    await db.collection('notifications').add({
      data: {
        _openid: post._openid,
        type: 'gather_join',
        post_id: postId,
        from_openid: OPENID,
        from_name: user.nickname || '有人',
        content: `${user.nickname || '有人'} 报名参加了你的局`,
        is_read: false,
        createTime: db.serverDate(),
      },
    }).catch(() => {});
  }

  return { code: 0, action: 'join' };
};
