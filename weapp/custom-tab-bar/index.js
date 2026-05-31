const app = getApp()

Component({
  data: {
    selected: 0,
    unreadCount: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: 'home', iconActive: 'home-active' },
      { pagePath: '/pages/messages/index', text: '消息', icon: 'message', iconActive: 'message-active' },
      { pagePath: '/pages/boards/index', text: '板块', icon: 'boards', iconActive: 'boards-active' },
      { pagePath: '/pages/profile/index', text: '我的', icon: 'profile', iconActive: 'profile-active' },
    ],
    hideTabBar: false
  },
  lifetimes: {
    attached() {
      this.checkVisibility()
      this.pollUnread()
      this._interval = setInterval(() => this.pollUnread(), 15000)
    },
    detached() {
      if (this._interval) clearInterval(this._interval)
    }
  },
  pageLifetimes: {
    show() {
      this.checkVisibility()
    }
  },
  methods: {
    checkVisibility() {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (!currentPage) return
      const route = currentPage.route || ''
      // 和网页版一致的隐藏逻辑：'/login', '/create', '/verify', '/admin', '/my/', '/settings'
      const hideRoutes = ['pages/login/', 'pages/create-post/', 'pages/verify/', 'pages/admin-verify/', 'pages/my-', 'pages/settings/']
      const hide = hideRoutes.some(r => route.startsWith(r))
      if (hide !== this.data.hideTabBar) {
        this.setData({ hideTabBar: hide })
      }
    },
    pollUnread() {
      const user = wx.getStorageSync('user')
      if (!user) { this.setData({ unreadCount: 0 }); return }
      const api = require('../utils/api')
      api.getNotifications().then(res => {
        this.setData({ unreadCount: res.unread_count || 0 })
      }).catch(() => {})
    },
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const item = this.data.list[index]
      wx.switchTab({ url: item.pagePath })
    },
    async handleFab() {
      if (!wx.getStorageSync('user')) {
        wx.navigateTo({ url: '/pages/login/index' })
        return
      }
      // 从云端获取最新用户信息（确保认证状态是最新的）
      wx.showLoading({ title: '加载中' })
      try {
        const api = require('../utils/api')
        const auth = require('../utils/auth')
        const user = await api.getMyProfile()
        wx.hideLoading()
        if (user) {
          auth.setUser(user)
          if (user.verification_status === 'approved' || user.is_verified) {
            wx.switchTab({ url: '/pages/create-post/index' })
            return
          }
        }
      } catch(e) {
        wx.hideLoading()
        // 云端失败时回退到本地缓存判断
        const user = wx.getStorageSync('user') || {}
        if (user.verification_status === 'approved' || user.is_verified) {
          wx.switchTab({ url: '/pages/create-post/index' })
          return
        }
      }
      wx.navigateTo({ url: '/pages/verify/index' })
    }
  }
})
