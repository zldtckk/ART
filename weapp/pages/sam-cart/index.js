const api = require('../../utils/api');
const auth = require('../../utils/auth');
const cart = require('../../utils/samCart');

Page({
  data: {
    items: [],
    note: '',
    total: '0.00',
    submitting: false,
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const items = cart.getCart();
    this.setData({ items, total: cart.getCartTotal().toFixed(2) });
  },

  incr(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.items.find(i => i.dish_id === id);
    if (!item) return;
    if (item.qty >= cart.MAX_QTY) {
      wx.showToast({ title: `单个菜品最多${cart.MAX_QTY}件`, icon: 'none' });
      return;
    }
    cart.setQty(id, item.qty + 1);
    this.refresh();
  },

  decr(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.items.find(i => i.dish_id === id);
    if (!item) return;
    cart.setQty(id, item.qty - 1);
    this.refresh();
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    cart.removeFromCart(id);
    this.refresh();
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  async submit() {
    if (!this.data.items.length) {
      wx.showToast({ title: '购物车是空的', icon: 'none' });
      return;
    }
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    this.setData({ submitting: true });
    try {
      const items = this.data.items.map(i => ({ dish_id: i.dish_id, qty: i.qty, name: i.name }));
      const order = await api.createOrder(items, this.data.note.trim());
      cart.clearCart();
      const warnings = [];
      if (order._skipped.length) warnings.push(`「${order._skipped.join('、')}」已下架，未加入订单`);
      if (order._capped.length) warnings.push(`「${order._capped.join('、')}」超过单品上限，已按${cart.MAX_QTY}件下单`);
      if (warnings.length) {
        wx.showModal({
          title: '订单有变动',
          content: warnings.join('\n'),
          showCancel: false,
          success: () => wx.redirectTo({ url: `/pages/sam-order-detail/index?id=${order.id}` }),
        });
      } else {
        wx.redirectTo({ url: `/pages/sam-order-detail/index?id=${order.id}` });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '下单失败', icon: 'none' });
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
});
