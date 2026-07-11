const { BOARDS } = require('../../utils/constants')

Page({
  data: {
    boards: [
      { key: 'circle', name: '画室圈', icon: '🎨', desc: '画室日常、学习交流、求助讨论' },
      { key: 'market', name: '二手集市', icon: '🏪', desc: '画材、教材、二手交易' },
      { key: 'sam', name: '山姆代购', icon: '🛒', desc: '选好菜品下单，分享给工作人员代买' }
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
    else if (board === 'sam') wx.navigateTo({ url: '/pages/sam-shop/index' })
    else wx.showToast({ title: '开发中', icon: 'none' })
  }
})
