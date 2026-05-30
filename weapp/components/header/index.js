Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: true
    },
    showAction: {
      type: Boolean,
      value: false
    },
    actionText: {
      type: String,
      value: ''
    }
  },

  methods: {
    onBack: function () {
      wx.navigateBack({
        delta: 1
      });
    },

    onAction: function () {
      this.triggerEvent('action');
    }
  }
});
