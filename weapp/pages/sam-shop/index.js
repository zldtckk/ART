const api = require('../../utils/api');
const cart = require('../../utils/samCart');

Page({
  data: {
    dishes: [],
    loading: true,
    cartCount: 0,
    cartTotal: '0.00',
    unavailable: false,
  },

  onLoad() {
    if (getApp().getCurrentCity() !== 'guangzhou') {
      this.setData({ unavailable: true, loading: false });
      return;
    }
    this.loadDishes();
  },

  onShow() {
    this.refreshCart();
  },

  async loadDishes() {
    this.setData({ loading: true });
    try {
      const dishes = await api.getDishes();
      this.setData({ dishes, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  refreshCart() {
    this.setData({
      cartCount: cart.getCartCount(),
      cartTotal: cart.getCartTotal().toFixed(2),
    });
  },

  addToCart(e) {
    const id = e.currentTarget.dataset.id;
    const dish = this.data.dishes.find(d => d.id === id || d._id === id);
    if (!dish) return;
    cart.addToCart(dish);
    this.refreshCart();
    wx.showToast({ title: '已加入购物车', icon: 'none', duration: 600 });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url], current: url });
  },

  goCart() {
    wx.navigateTo({ url: '/pages/sam-cart/index' });
  },

  goMyOrders() {
    wx.navigateTo({ url: '/pages/sam-my-orders/index' });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },
});
