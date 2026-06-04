const api = require('../../utils/api');
const { GATHERING_TYPES } = require('../../utils/constants');

const GATHER_TYPE_MAP = { food: '约饭', play: '约玩', walk: '约逛', photo: '约拍', other: '其他' };

Page({
  data: {
    types: [{ key: 'all', name: '全部' }, ...GATHERING_TYPES],
    currentType: 'all',
    gatherings: [],
    loading: true,
    loadingMore: false,
    page: 1,
    hasMore: true,
  },

  onLoad() { this.loadGatherings(); },
  goBack() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/index/index' });
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentType: type, gatherings: [], page: 1, hasMore: true, loading: true });
    this.loadGatherings();
  },

  async loadGatherings() {
    const type = this.data.currentType !== 'all' ? this.data.currentType : undefined;
    try {
      const items = await api.getGatherings({ type, page: this.data.page, limit: 20 });
      const processed = (items || []).map(p => ({
        ...p,
        gather_type_name: GATHER_TYPE_MAP[p.gather_type] || '攒局',
        gather_spots_left: Math.max(0, (p.gather_limit || 4) - (p.gather_count || 1)),
        gather_closed: Date.now() > new Date(p.createTime).getTime() + 7 * 24 * 60 * 60 * 1000 || p.gather_count >= p.gather_limit,
      }));
      this.setData({
        gatherings: this.data.page === 1 ? processed : this.data.gatherings.concat(processed),
        loading: false,
        loadingMore: false,
        hasMore: items.length >= 20,
      });
    } catch (e) {
      this.setData({ loading: false, loadingMore: false });
    }
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    this.loadGatherings();
  },

  goPost(e) {
    wx.navigateTo({ url: `/pages/post-detail/index?id=${e.currentTarget.dataset.id}` });
  },
});
