const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const OPENID = wxContext.OPENID;
    const { postId } = event;

    if (!postId) return { code: 1, msg: '参数错误' };
    if (!OPENID) return { code: 1, msg: '未获取到用户身份' };

    const userRes = await db.collection('users').where({ _openid: OPENID }).get();
    const user = userRes.data[0] || {};

    // 获取帖子
    let post;
    try {
      const postRes = await db.collection('posts').doc(postId).get();
      post = postRes.data;
    } catch (e) {
      return { code: 3, msg: '帖子不存在' };
    }

    // 校验未过期（7天）
    const createTs = post.createTime && post.createTime.toDate ? post.createTime.toDate().getTime() : Date.now();
    const expireTime = createTs + 7 * 24 * 60 * 60 * 1000;
    if (Date.now() > expireTime) return { code: 5, msg: '该局已过期' };

    // 查是否已报名
    const joinRes = await db.collection('gatherings')
      .where({ post_id: postId, _openid: OPENID })
      .get();
    const alreadyJoined = joinRes.data.length > 0;

    if (alreadyJoined) {
      await db.collection('gatherings').doc(joinRes.data[0]._id).remove();
      await db.collection('posts').doc(postId).update({ data: { gather_count: _.inc(-1) } });
      return { code: 0, action: 'cancel' };
    }

    if (!user.is_verified) return { code: 2, msg: '仅认证画室学生可报名攒局，请先完成认证' };

    // 校验未满员
    if ((post.gather_count || 1) >= (post.gather_limit || 4)) {
      return { code: 6, msg: '该局已满员' };
    }

    // 报名
    await db.collection('gatherings').add({
      data: { post_id: postId, _openid: OPENID, createTime: db.serverDate() },
    });
    await db.collection('posts').doc(postId).update({ data: { gather_count: _.inc(1) } });

    // 通知发起人
    if (post._openid && post._openid !== OPENID) {
      await db.collection('notifications').add({
        data: {
          _openid: post._openid,
          type: 'gather_join',
          post_id: postId,
          from_openid: OPENID,
          content: `${user.nickname || '有人'} 报名参加了你的局`,
          is_read: false,
          createTime: db.serverDate(),
        },
      }).catch(() => {});
    }

    return { code: 0, action: 'join' };

  } catch (e) {
    console.error('joinGathering error:', e);
    return { code: -1, msg: e.message || '服务异常' };
  }
};
