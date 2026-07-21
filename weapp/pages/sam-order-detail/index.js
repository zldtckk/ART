const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { formatTime } = require('../../utils/formatter');

const STATUS_TEXT = { pending: '待采购', done: '已完成', cancelled: '已取消' };

Page({
  data: {
    order: null,
    loading: true,
    isAdmin: false,
    currentUserOpenid: '',
    adminNoteInput: '',
    noteSaving: false,
    staffQr: '',
  },

  onLoad(options) {
    this.orderId = options.id;
    const user = auth.getUserProfile();
    this.setData({
      isAdmin: !!(user && user.is_admin),
      currentUserOpenid: user && (user._openid || user.openid),
    });
    this.loadOrder();
    api.getStaffQr().then(staffQr => this.setData({ staffQr })).catch(() => {});
  },

  previewStaffQr() {
    if (!this.data.staffQr) return;
    wx.showToast({ title: '长按图片识别二维码添加', icon: 'none', duration: 2000 });
    wx.previewImage({ urls: [this.data.staffQr], current: this.data.staffQr });
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
        adminNoteInput: order.admin_note || '',
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

  onAdminNoteInput(e) {
    this.setData({ adminNoteInput: e.detail.value });
  },

  saveAdminNote() {
    this.setData({ noteSaving: true });
    api.updateOrderAdminNote(this.orderId, this.data.adminNoteInput.trim()).then(() => {
      this.setData({ noteSaving: false });
      wx.showToast({ title: '备注已保存', icon: 'success' });
    }).catch((e) => {
      this.setData({ noteSaving: false });
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    });
  },

  cancelOrder() {
    wx.showModal({
      title: '确认取消',
      content: '取消后不可恢复，确定要取消这个订单吗？',
      success: (res) => {
        if (!res.confirm) return;
        api.cancelOrder(this.orderId).then(() => {
          wx.showToast({ title: '已取消', icon: 'success' });
          this.loadOrder();
        }).catch((e) => {
          wx.showToast({ title: e.message || '取消失败', icon: 'none' });
        });
      },
    });
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
