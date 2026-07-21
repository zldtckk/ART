const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { formatTime } = require('../../utils/formatter');

const ORDER_STATUS_TEXT = { pending: '待采购', done: '已完成', cancelled: '已取消' };
const PERMISSION_LABELS = { verify: '认证审核', studios: '画室管理', sam: '代购后台' };

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
    staffQr: '',
    newDish: { name: '', price: '', unit: '份', image: '' },
    dishSubmitting: false,
    orders: [],
    orderFilter: 'pending',
    orderSummary: [],
    isSuperAdmin: false,
    canVerify: false,
    canStudios: false,
    canSam: false,
    admins: [],
    searchKeyword: '',
    searchResults: [],
    selectedUser: null,
    newAdminPermissions: { verify: true, studios: true, sam: true },
    samOrderEnabled: true,
    locations: [],
    newLocationName: '',
  },

  onLoad() {
    const user = auth.getAuth().user;
    const isSuperAdmin = !!(user && user.is_super_admin);
    const permissions = (user && user.admin_permissions) || [];
    const canVerify = isSuperAdmin || permissions.includes('verify');
    const canStudios = isSuperAdmin || permissions.includes('studios');
    const canSam = isSuperAdmin || permissions.includes('sam');
    // 默认打开第一个自己有权限的tab，而不是写死'verify'（没权限还硬展示会显得"权限没生效"）
    const firstTab = canVerify ? 'verify' : canStudios ? 'studio' : canSam ? 'dishes' : 'verify';

    this.setData({ isSuperAdmin, canVerify, canStudios, canSam, tab: firstTab, loading: false });

    if (canVerify) this.loadPending();
    this.loadStudios(); // 公开接口，画室列表本身不分权限，只是"新增画室"按钮受 canStudios 控制
    if (canSam && firstTab === 'dishes') { this._dishesLoaded = true; this.loadDishes(); this.loadLocations(); }
  },

  onPullDownRefresh() {
    const { tab } = this.data;
    const done = () => wx.stopPullDownRefresh();
    if (tab === 'verify') { this.loadPending(); done(); }
    else if (tab === 'studio') { this.loadStudios(); done(); }
    else if (tab === 'dishes') { this.loadDishes(); done(); }
    else if (tab === 'orders') { this.loadOrders(); done(); }
    else if (tab === 'admins') { this.loadAdmins(); done(); }
    else done();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    if (tab === 'dishes' && !this._dishesLoaded) { this._dishesLoaded = true; this.loadDishes(); this.loadLocations(); }
    if (tab === 'orders' && !this._ordersLoaded) { this._ordersLoaded = true; this.loadOrders(); }
    if (tab === 'admins' && !this._adminsLoaded) { this._adminsLoaded = true; this.loadAdmins(); }
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
    api.getStaffQr().then(staffQr => {
      this.setData({ staffQr });
    }).catch(() => {});
  },

  async chooseStaffQr() {
    try {
      const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] });
      const url = await api.uploadImage(res.tempFilePaths[0]);
      await api.setStaffQr(url);
      this.setData({ staffQr: url });
      wx.showToast({ title: '已更新', icon: 'success' });
    } catch (e) {
      if (e && e.message) wx.showToast({ title: e.message, icon: 'none' });
    }
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

  // ── 山姆代购：送货机构管理 ──

  loadLocations() {
    api.getAdminSamLocations().then(locations => {
      this.setData({ locations });
    }).catch(() => {});
  },

  onLocationNameInput(e) {
    this.setData({ newLocationName: e.detail.value });
  },

  addLocation() {
    const name = this.data.newLocationName.trim();
    if (!name) { wx.showToast({ title: '请输入机构名称', icon: 'none' }); return; }
    wx.showLoading({ title: '添加中' });
    api.addSamLocation({ name }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '添加成功', icon: 'success' });
      this.setData({ newLocationName: '' });
      this.loadLocations();
    }).catch((e) => {
      wx.hideLoading();
      wx.showToast({ title: e.message || '添加失败', icon: 'none', duration: 3000 });
    });
  },

  toggleLocation(e) {
    const { id, enabled } = e.currentTarget.dataset;
    api.updateSamLocation(id, { is_enabled: !enabled }).then(() => this.loadLocations()).catch(() => {
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  deleteLocation(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后用户下单将无法选择该机构，确定删除？',
      success: (res) => {
        if (!res.confirm) return;
        api.deleteSamLocation(id).then(() => this.loadLocations()).catch(() => {
          wx.showToast({ title: '删除失败', icon: 'none' });
        });
      },
    });
  },

  // ── 山姆代购：订单管理 ──

  loadOrders() {
    api.getSamOrderSwitch().then(enabled => this.setData({ samOrderEnabled: enabled })).catch(() => {});
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
    this.loadOrderSummary();
  },

  // 采购清单：把当前筛选状态下所有订单按商品汇总，一眼看清每样东西要买几份
  // "全部"状态下汇总意义不大（已完成/已取消的不用再买），统一按"待采购"统计
  loadOrderSummary() {
    api.getOrdersSummary('pending').then(summary => {
      this.setData({ orderSummary: summary });
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

  // ── 全局下单开关 ──

  toggleSamOrderSwitch() {
    const newEnabled = !this.data.samOrderEnabled;
    const label = newEnabled ? '开放下单' : '关闭下单';
    wx.showModal({
      title: `确认${label}`,
      content: newEnabled ? '开放后所有用户可以正常下单' : '关闭后所有用户将无法提交新订单',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中' });
        api.setSamOrderSwitch(newEnabled).then(enabled => {
          wx.hideLoading();
          this.setData({ samOrderEnabled: enabled });
          wx.showToast({ title: enabled ? '下单已开放' : '下单已关闭', icon: 'success' });
        }).catch((err) => {
          wx.hideLoading();
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        });
      },
    });
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

  // ── 管理员管理（超级管理员）──

  loadAdmins() {
    api.getAdmins().then(admins => {
      const list = admins.map(a => ({
        ...a,
        _permLabels: (a.permissions || []).map(p => PERMISSION_LABELS[p] || p).join('、') || '（无权限）',
      }));
      this.setData({ admins: list });
    }).catch(() => wx.showToast({ title: '加载失败', icon: 'none' }));
  },

  onSearchKeywordInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword, selectedUser: null });
    clearTimeout(this._searchTimer);
    if (!keyword.trim()) { this.setData({ searchResults: [] }); return; }
    // 防抖，别每敲一个字就发一次请求
    this._searchTimer = setTimeout(() => {
      api.searchUsers(keyword.trim()).then(users => {
        this.setData({ searchResults: users });
      }).catch(() => {});
    }, 300);
  },

  selectSearchResult(e) {
    const openid = e.currentTarget.dataset.openid;
    const user = this.data.searchResults.find(u => u.openid === openid);
    if (!user) return;
    this.setData({
      selectedUser: user,
      searchKeyword: user.nickname || user.sys_user_id || openid,
      searchResults: [],
    });
  },

  toggleNewAdminPerm(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`newAdminPermissions.${key}`]: !this.data.newAdminPermissions[key] });
  },

  addAdmin() {
    const user = this.data.selectedUser;
    if (!user) { wx.showToast({ title: '请先搜索并选中一个用户', icon: 'none' }); return; }
    const permissions = Object.keys(this.data.newAdminPermissions).filter(k => this.data.newAdminPermissions[k]);
    wx.showLoading({ title: '添加中' });
    api.addAdmin(user.openid, permissions).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '添加成功', icon: 'success' });
      this.setData({
        searchKeyword: '', searchResults: [], selectedUser: null,
        newAdminPermissions: { verify: true, studios: true, sam: true },
      });
      this.loadAdmins();
    }).catch((e) => {
      wx.hideLoading();
      wx.showToast({ title: e.message || '添加失败', icon: 'none', duration: 3000 });
    });
  },

  toggleAdminPerm(e) {
    const { openid, key } = e.currentTarget.dataset;
    const admin = this.data.admins.find(a => a.openid === openid);
    if (!admin || admin.is_super_admin) return;
    const permissions = admin.permissions.includes(key)
      ? admin.permissions.filter(p => p !== key)
      : [...admin.permissions, key];
    api.updateAdminPermissions(openid, permissions).then(() => this.loadAdmins()).catch(() => {
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  removeAdmin(e) {
    const openid = e.currentTarget.dataset.openid;
    wx.showModal({
      title: '确认撤销',
      content: '撤销后该用户将失去所有管理员权限，确定吗？',
      success: (res) => {
        if (!res.confirm) return;
        api.removeAdmin(openid).then(() => {
          wx.showToast({ title: '已撤销', icon: 'success' });
          this.loadAdmins();
        }).catch((e2) => wx.showToast({ title: e2.message || '操作失败', icon: 'none' }));
      },
    });
  },
});
