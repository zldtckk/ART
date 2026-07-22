const api = require('../../utils/api');
const auth = require('../../utils/auth');
const cart = require('../../utils/samCart');
const { handleApiError } = require('../../utils/verifyGate');

Page({
  data: {
    items: [],
    note: '',
    total: '0.00',
    submitting: false,
    locations: [],
    locationIndex: -1,
  },

  onShow() {
    this.refresh();
    this.loadLocations();
  },

  async loadLocations() {
    const locations = await api.getSamLocations();
    this.setData({ locations, locationIndex: locations.length === 1 ? 0 : -1 });
  },

  onLocationChange(e) {
    this.setData({ locationIndex: Number(e.detail.value) });
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
    const { locations, locationIndex } = this.data;
    if (locations.length > 0 && locationIndex < 0) {
      wx.showToast({ title: '请选择送货地点', icon: 'none' });
      return;
    }
    const deliveryLocation = locations.length > 0 ? locations[locationIndex].name : '';
    this.setData({ submitting: true });
    try {
      const items = this.data.items.map(i => ({ dish_id: i.dish_id, qty: i.qty, name: i.name }));
      const order = await api.createOrder(items, this.data.note.trim(), deliveryLocation);

      const warnings = [];
      if (order._skipped.length) warnings.push(`「${order._skipped.join('、')}」已下架，未加入订单`);
      if (order._capped.length) warnings.push(`「${order._capped.join('、')}」超过单品上限，已按${cart.MAX_QTY}件下单`);

      const showWarningThenPay = async () => {
        // 拉取微信支付参数
        const payParams = await api.prepayOrder(order.id);
        await wx.requestPayment(payParams);
        // 支付成功，跳详情页轮询等回调确认
        cart.clearCart();
        wx.redirectTo({ url: `/pages/sam-order-detail/index?id=${order.id}&waitPayment=1` });
      };

      if (warnings.length) {
        wx.showModal({
          title: '订单有变动',
          content: warnings.join('\n'),
          showCancel: false,
          success: () => showWarningThenPay().catch((e) => this._handlePayError(e, order.id)),
        });
      } else {
        await showWarningThenPay();
      }
    } catch (e) {
      this._handlePayError(e);
    } finally {
      this.setData({ submitting: false });
    }
  },

  _handlePayError(e, orderId) {
    const errMsg = e && e.errMsg || '';
    if (errMsg.includes('cancel')) {
      // 用户主动取消支付，跳到订单页让他重新支付或取消订单
      if (orderId) wx.redirectTo({ url: `/pages/sam-order-detail/index?id=${orderId}` });
      return;
    }
    handleApiError(e, '支付失败，请稍后重试');
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },
});
