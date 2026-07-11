const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { formatTime } = require('../../utils/formatter');

const STATUS_TEXT = { pending: '待采购', done: '已完成', cancelled: '已取消' };

Page({
  data: {
    order: null,
    loading: true,
    isAdmin: false,
  },

  onLoad(options) {
    this.orderId = options.id;
    const user = auth.getUserProfile();
    this.setData({ isAdmin: !!(user && (user.role === 'admin' || user.role === 'circle_master')) });
    this.loadOrder();
  },

  async loadOrder() {
    this.setData({ loading: true });
    try {
      const order = await api.getOrder(this.orderId);
      this.setData({
        order: {
          ...order,
          _statusText: STATUS_TEXT[order.status] || order.status,
          _createdAt: formatTime(order.createTime),
        },
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '订单不存在', icon: 'none' });
    }
  },

  async markDone() {
    try {
      await api.updateOrderStatus(this.orderId, 'done');
      wx.showToast({ title: '已标记完成', icon: 'success' });
      this.loadOrder();
    } catch (e) {
      wx.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url], current: url });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  onShareAppMessage() {
    const order = this.data.order;
    const count = order ? order.items.reduce((s, i) => s + i.qty, 0) : 0;
    return {
      title: order ? `山姆代购订单 · 共${count}件 · ¥${order.total}` : '山姆代购订单',
      path: `/pages/sam-order-detail/index?id=${this.orderId}`,
    };
  },
});
