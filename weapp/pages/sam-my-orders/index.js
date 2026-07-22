const api = require('../../utils/api');
const { formatTime } = require('../../utils/formatter');

const STATUS_TEXT = { pending_payment: '待付款', pending: '待采购', done: '已完成', cancelled: '已取消' };

Page({
  data: {
    orders: [],
    loading: true,
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      const orders = await api.getMyOrders();
      const processed = orders.map(o => ({
        ...o,
        _statusText: STATUS_TEXT[o.status] || o.status,
        _createdAt: formatTime(o.createTime),
        _count: (o.items || []).reduce((s, i) => s + i.qty, 0),
      }));
      this.setData({ orders: processed, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/sam-order-detail/index?id=${id}` });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },
});
