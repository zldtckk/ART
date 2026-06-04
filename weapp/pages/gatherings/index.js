const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { GATHERING_TYPES } = require('../../utils/constants');

const GATHER_TYPE_MAP = { food: '约饭', play: '约玩', walk: '约逛', photo: '约拍', other: '其他' };

function processItems(items) {
  return (items || []).map(p => ({
    ...p,
    gather_type_name: GATHER_TYPE_MAP[p.gather_type] || '攒局',
    gather_spots_left: Math.max(0, (p.gather_limit || 4) - (p.gather_count || 1)),
    gather_closed: Date.now() > new Date(p.createTime).getTime() + 7 * 24 * 60 * 60 * 1000 || p.gather_count >= p.gather_limit,
  }));
}

Page({
  data: {
    tab: 'all', // 'all' | 'joined'
    types: [{ key: 'all', name: '全部' }, ...GATHERING_TYPES],
    currentType: 'all',
    gatherings: [],
    joined: [],
    loading: true,
    loadingMore: false,
    page: 1,
    hasMore: true,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadGatherings();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.tab) return;
    this.setData({ tab, gatherings: [], joined: [], page: 1, hasMore: true, loading: true, currentType: 'all' });
    if (tab === 'all') this.loadGatherings();
    else this.loadJoined();
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
      const processed = processItems(items);
      this.setData({
        gatherings: this.data.page === 1 ? processed : this.data.gatherings.concat(processed),
        loading: false, loadingMore: false, hasMore: items.length >= 20,
      });
    } catch (e) {
      this.setData({ loading: false, loadingMore: false });
    }
  },

  async loadJoined() {
    try {
      const openid = getApp().globalData.user && getApp().globalData.user._openid;
      if (!openid) { this.setData({ loading: false }); return; }
      const joinRes = await api.db.collection('gatherings').where({ _openid: openid }).orderBy('createTime', 'desc').get();
      if (!joinRes.data.length) { this.setData({ joined: [], loading: false }); return; }
      const postIds = joinRes.data.map(g => g.post_id);
      const postsRes = await api.db.collection('posts').where({ _id: api._.in(postIds) }).get();
      const processed = processItems(postsRes.data.map(p => ({ id: p._id, ...p })));
      this.setData({ joined: processed.map(p => ({ ...p, is_joined: true })), loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  loadMore() {
    if (this.data.tab !== 'all' || !this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    this.loadGatherings();
  },

  goCreate() {
    if (!auth.isLoggedIn()) { wx.navigateTo({ url: '/pages/login/index' }); return; }
    wx.navigateTo({ url: '/pages/create-gathering/index' });
  },

  goPost(e) {
    wx.navigateTo({ url: `/pages/post-detail/index?id=${e.currentTarget.dataset.id}` });
  },
});
