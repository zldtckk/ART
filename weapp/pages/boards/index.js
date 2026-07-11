const { BOARDS } = require('../../utils/constants')

Page({
  data: {
    currentCity: 'hangzhou',
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.setData({ currentCity: getApp().getCurrentCity() })
  },
  goBoard(e) {
    const board = e.currentTarget.dataset.board
    if (board === 'circle') wx.navigateTo({ url: '/pages/board-circle/index' })
    else if (board === 'market') wx.navigateTo({ url: '/pages/board-market/index' })
    else if (board === 'sam') wx.navigateTo({ url: '/pages/sam-shop/index' })
    else if (board === 'fan') wx.navigateTo({ url: '/pages/board-fan/index' })
    else wx.showToast({ title: '开发中', icon: 'none' })
  }
})
