const api = require('../../utils/api');
const auth = require('../../utils/auth');

const DIM_NAMES = ['构图', '结构与比例', '细节与刻画', '表现与技法'];

Page({
  data: { scores: [], loading: true, expandedId: null },

  onLoad() { this.loadScores(); },

  onShow() {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
  },

  loadScores() {
    api.getScoreHistory().then((scores) => {
      const processed = scores.map((s) => ({
        ...s,
        _dimList: DIM_NAMES.filter((name) => s.dimensions && s.dimensions[name] !== undefined)
          .map((name) => ({ name, value: s.dimensions[name] })),
      }));
      this.setData({ scores: processed, loading: false });
    }).catch(() => this.setData({ loading: false }));
  },

  toggleExpand(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedId: this.data.expandedId === id ? null : id });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url], current: url });
  },

  goSubmitHomework(e) {
    const item = e.currentTarget.dataset.item;
    getApp().globalData.pendingComparison = {
      id: item.id,
      image_url: item.image_url,
      current_score: item.current_score,
      predicted_score: item.predicted_score,
      tier: item.tier,
      strength: item.strength,
      problems: item.problems,
      comment: item.comment,
    };
    wx.navigateTo({ url: '/pages/ai-score/index' });
  },

  goBack() { wx.navigateBack(); },
});
