const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { formatTime } = require('../../utils/formatter');

const ORDER_STATUS_TEXT = { pending: '待采购', done: '已完成', cancelled: '已取消' };

Page({
  data: {
    tab: 'verify',
    pendingList: [],
    studios: [],
    newStudioName: '',
    newStudioDistrict: '',
    loading: true,
    showRejectModal: false,
    rejectTargetId: null,
    rejectReason: '',
    dishes: [],
    newDish: { name: '', price: '', unit: '份', image: '' },
    dishSubmitting: false,
    orders: [],
    orderFilter: 'pending',
  },

  onLoad() {
    this.loadPending();
    this.loadStudios();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    if (tab === 'dishes' && !this._dishesLoaded) { this._dishesLoaded = true; this.loadDishes(); }
    if (tab === 'orders' && !this._ordersLoaded) { this._ordersLoaded = true; this.loadOrders(); }
  },

  loadPending() {
    Promise.all([api.getPendingVerifications(), api.getStudios()]).then(([users, studios]) => {
      const studioMap = {};
      (studios || []).forEach(s => { studioMap[s._id] = s.name; studioMap[s.id] = s.name; });
      const list = (users || []).map(v => ({
        ...v,
        _displayName: v.real_name || v.nickname || '未知',
        _studioName: studioMap[v.studio_id] || v.studio_id || '未填写',
      }));
      this.setData({ pendingList: list, studios });
    }).catch(() => {}).finally(() => this.setData({ loading: false }));
  },

  loadStudios() {
    api.getStudios().then(studios => {
      this.setData({ studios });
    }).catch((e) => { console.error('loadStudios failed', e); });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url], current: url });
  },

  approve(e) {
    const id = e.currentTarget.dataset.id;
    api.approveVerification(id).then(() => {
      wx.showToast({ title: '已通过', icon: 'success' });
      this.setData({ pendingList: this.data.pendingList.filter(v => v.id !== id && v._id !== id) });
    }).catch(() => wx.showToast({ title: '操作失败', icon: 'none' }));
  },

  reject(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ showRejectModal: true, rejectTargetId: id, rejectReason: '' });
  },

  onRejectReasonInput(e) {
    this.setData({ rejectReason: e.detail.value });
  },

  cancelReject() {
    this.setData({ showRejectModal: false, rejectTargetId: null, rejectReason: '' });
  },

  confirmReject() {
    const { rejectTargetId, rejectReason } = this.data;
    if (!rejectReason.trim()) {
      wx.showToast({ title: '请填写拒绝原因', icon: 'none' });
      return;
    }
    this.setData({ showRejectModal: false });
    wx.showLoading({ title: '处理中' });
    api.rejectVerification(rejectTargetId, rejectReason.trim()).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '已拒绝', icon: 'success' });
      this.setData({ pendingList: this.data.pendingList.filter(v => v.id !== rejectTargetId && v._id !== rejectTargetId) });
    }).catch(() => { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'none' }); });
  },

  // ── 山姆代购：菜品管理 ──

  loadDishes() {
    api.getAllDishes().then(dishes => {
      this.setData({ dishes });
    }).catch(() => {});
  },

  onDishNameInput(e) { this.setData({ 'newDish.name': e.detail.value }); },
  onDishPriceInput(e) { this.setData({ 'newDish.price': e.detail.value }); },
  onDishUnitInput(e) { this.setData({ 'newDish.unit': e.detail.value }); },

  async chooseDishImage() {
    try {
      const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] });
      const fileID = await api.uploadImage(res.tempFilePaths[0]);
      this.setData({ 'newDish.image': fileID });
    } catch (e) { /* 用户取消 */ }
  },

  async addDish() {
    const { name, price, unit, image } = this.data.newDish;
    if (!name.trim()) { wx.showToast({ title: '请输入菜品名称', icon: 'none' }); return; }
    const priceNum = parseFloat(price);
    if (!(priceNum >= 0)) { wx.showToast({ title: '请输入有效价格', icon: 'none' }); return; }
    this.setData({ dishSubmitting: true });
    try {
      await api.addDish({ name: name.trim(), price: priceNum, unit: (unit || '份').trim(), image });
      this.setData({ newDish: { name: '', price: '', unit: '份', image: '' } });
      wx.showToast({ title: '添加成功', icon: 'success' });
      this.loadDishes();
    } catch (e) {
      wx.showToast({ title: e.message || '添加失败', icon: 'none' });
    } finally {
      this.setData({ dishSubmitting: false });
    }
  },

  toggleDishAvailable(e) {
    const { id, available } = e.currentTarget.dataset;
    api.updateDish(id, { is_available: !available }).then(() => this.loadDishes()).catch(() => {
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  deleteDish(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除该菜品？',
      success: (res) => {
        if (!res.confirm) return;
        api.deleteDish(id).then(() => this.loadDishes()).catch(() => {
          wx.showToast({ title: '删除失败', icon: 'none' });
        });
      },
    });
  },

  previewDishImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url], current: url });
  },

  // ── 山姆代购：订单管理 ──

  loadOrders() {
    const status = this.data.orderFilter === 'all' ? undefined : this.data.orderFilter;
    api.getOrders(status).then(orders => {
      const processed = orders.map(o => ({
        ...o,
        _statusText: ORDER_STATUS_TEXT[o.status] || o.status,
        _createdAt: formatTime(o.createTime),
        _count: (o.items || []).reduce((s, i) => s + i.qty, 0),
      }));
      this.setData({ orders: processed });
    }).catch(() => {});
  },

  switchOrderFilter(e) {
    this.setData({ orderFilter: e.currentTarget.dataset.filter }, () => this.loadOrders());
  },

  viewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/sam-order-detail/index?id=${id}` });
  },

  markOrderDone(e) {
    const id = e.currentTarget.dataset.id;
    api.updateOrderStatus(id, 'done').then(() => {
      wx.showToast({ title: '已标记完成', icon: 'success' });
      this.loadOrders();
    }).catch(() => wx.showToast({ title: '操作失败', icon: 'none' }));
  },

  goBack() { wx.navigateBack(); },
  onStudioNameInput(e) { this.setData({ newStudioName: e.detail.value }); },
  onStudioDistrictInput(e) { this.setData({ newStudioDistrict: e.detail.value }); },

  addStudio() {
    if (!this.data.newStudioName.trim()) {
      wx.showToast({ title: '请输入画室名称', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '添加中' });
    api.addStudio(this.data.newStudioName.trim(), this.data.newStudioDistrict.trim()).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '添加成功', icon: 'success' });
      this.setData({ newStudioName: '', newStudioDistrict: '' });
      this.loadStudios();
    }).catch((e) => {
      wx.hideLoading();
      wx.showToast({ title: e.message || '添加失败', icon: 'none', duration: 3000 });
    });
  },
});
