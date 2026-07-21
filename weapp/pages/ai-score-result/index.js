Page({
  data: {
    result: null,
    imageUrl: '',
    dimList: [],
    prevScore: null,
    scoreDelta: null,
    verdict: '',
    verdictSub: '',
  },

  onLoad() {
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('scoreResult', (data) => {
      const prevScore = data.prevScore || null;
      let scoreDelta = null;
      let verdict = '';
      let verdictSub = '';
      if (prevScore && data.result && data.result.current_score != null) {
        scoreDelta = data.result.current_score - prevScore.current_score;
        if (scoreDelta > 2) {
          verdict = '进步了';
          verdictSub = '上次的问题有改善，继续保持这个方向练';
        } else if (scoreDelta >= -2) {
          verdict = '基本持平';
          verdictSub = '整体水平稳定，继续针对具体问题强化练习';
        } else {
          verdict = '本次有所下滑';
          verdictSub = '状态波动很正常，看看老师点评里说了哪里可以调整';
        }
      }
      this.setData({ result: data.result, imageUrl: data.imageUrl, dimList: data.dimList, prevScore, scoreDelta, verdict, verdictSub });
    });
  },

  shareToCircle() {
    const { result, imageUrl } = this.data;
    if (!result) return;
    // create-post 是 tabBar 页，wx.navigateTo 打不进去，只能 switchTab；
    // switchTab 不传 query，所以用 globalData 暂存，create-post 的 onShow 里会消费掉。
    getApp().globalData.pendingPost = { content: result.post_text || '', imageUrl };
    wx.switchTab({ url: '/pages/create-post/index' });
  },

  testAgain() {
    wx.navigateBack();
  },

  goBack() {
    wx.navigateBack();
  },

  // 这个页面的结果数据是靠 eventChannel 从上一页传过来的，陌生人点分享链接进来时没有 opener，
  // 拿不到数据会一直转圈。所以转发目标不指向这个结果页本身，而是指向测分入口页，
  // 让分享出去的人能真的去测一下，而不是打开一个空白/卡住的报告页。
  onShareAppMessage() {
    const score = this.data.result && this.data.result.predicted_score;
    return {
      title: score ? `AI说我集训后能到${score}分，你也来测测你的素描` : 'AI素描测分 - 测测你的联考实力',
      path: '/pages/ai-score/index',
    };
  },

  onShareTimeline() {
    const score = this.data.result && this.data.result.predicted_score;
    return {
      title: score ? `AI说我集训后能到${score}分，你也来测测` : 'AI素描测分 - 测测你的联考实力',
      query: '',
    };
  },
});
