const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { handleApiError } = require('../../utils/verifyGate');

// 城市 → 联考省份映射
const CITY_PROVINCE = { hangzhou: 'zhejiang', guangzhou: 'guangdong' };

const FOUNDATION_OPTIONS = ['零基础 / 刚开始', '已学 3-6 个月', '正在集训', '系统学习 1 年以上'];
const MONTHS_OPTIONS = [
  { label: '6 个月以上', value: 6 },
  { label: '约 5 个月', value: 5 },
  { label: '约 4 个月', value: 4 },
  { label: '约 3 个月', value: 3 },
  { label: '约 2 个月', value: 2 },
  { label: '不足 2 个月', value: 1 },
];
const DIM_NAMES = ['构图', '结构与比例', '细节与刻画', '表现与技法'];

Page({
  data: {
    quota: { used: 0, limit: 50, remaining: 50 },
    province: 'guangdong',
    imagePath: '',
    imageUrl: '',
    foundationOptions: FOUNDATION_OPTIONS,
    foundationIndex: 2,
    monthsOptions: MONTHS_OPTIONS.map((m) => m.label),
    monthsIndex: 1,
    submitting: false,
    comparisonMode: false,
    prevScore: null,
  },

  onLoad() {
    const app = getApp();
    const city = (app.globalData && app.globalData.currentCity) || 'hangzhou';
    const province = CITY_PROVINCE[city] || 'guangdong';
    this.setData({ province });
    this.loadQuota();
  },

  onShow() {
    this.loadQuota();
    const app = getApp();
    const pending = app.globalData && app.globalData.pendingComparison;
    if (pending) {
      this.setData({ comparisonMode: true, prevScore: pending });
      app.globalData.pendingComparison = null;
    }
  },

  async loadQuota() {
    if (!auth.isLoggedIn()) return;
    const quota = await api.getScoreQuota();
    this.setData({ quota });
  },

  chooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'] }).then((res) => {
      this.setData({ imagePath: res.tempFilePaths[0], imageUrl: '' });
    }).catch(() => {});
  },

  onFoundationChange(e) {
    this.setData({ foundationIndex: Number(e.detail.value) });
  },

  onMonthsChange(e) {
    this.setData({ monthsIndex: Number(e.detail.value) });
  },

  async submit() {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    if (!this.data.imagePath || this.data.submitting) return;

    this.setData({ submitting: true });
    try {
      let imageUrl = this.data.imageUrl;
      if (!imageUrl) {
        imageUrl = await api.uploadImage(this.data.imagePath);
        this.setData({ imageUrl });
      }

      const foundation = this.data.foundationOptions[this.data.foundationIndex];
      const monthsLeft = MONTHS_OPTIONS[this.data.monthsIndex].value;
      const res = await api.submitScore(imageUrl, foundation, monthsLeft, this.data.province, this.data.prevScore);

      const dims = (res.data && res.data.dimensions) || {};
      const dimList = DIM_NAMES.filter((name) => dims[name] !== undefined).map((name) => ({ name, value: dims[name] }));

      this.setData({ quota: { used: res.used, limit: res.limit, remaining: res.remaining } });

      wx.navigateTo({
        url: '/pages/ai-score-result/index',
        success: (navRes) => {
          navRes.eventChannel.emit('scoreResult', {
            result: res.data,
            imageUrl,
            dimList,
            prevScore: this.data.comparisonMode ? this.data.prevScore : null,
          });
        },
      });
    } catch (e) {
      handleApiError(e, '测分失败，请稍后重试');
      this.loadQuota();
    } finally {
      this.setData({ submitting: false });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  onShareAppMessage() {
    return {
      title: 'AI帮我测了素描分，你来试试？',
      path: '/pages/ai-score/index',
    };
  },

  onShareTimeline() {
    return {
      title: 'AI素描测分，看看你离联考目标还有多远',
      query: '',
    };
  },
});
