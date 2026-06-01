const { BOARDS } = require('../../utils/constants')

Page({
  data: {
    boards: [
      { key: 'circle', name: '画室圈', icon: '🎨', desc: '画室日常、学习交流、求助讨论' },
      { key: 'market', name: '二手集市', icon: '🏪', desc: '画材、教材、二手交易' },
      { key: 'fan', name: '粉丝圈', icon: '⭐', desc: '偶像、同好、兴趣社群' }
    ]
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },
  goBoard(e) {
    const board = e.currentTarget.dataset.board
    if (board === 'circle') wx.navigateTo({ url: '/pages/board-circle/index' })
    else if (board === 'market') wx.navigateTo({ url: '/pages/board-market/index' })
    else if (board === 'fan') wx.navigateTo({ url: '/pages/board-fan/index' })
    else wx.showToast({ title: '开发中', icon: 'none' })
  }
})
