Component({
  properties: {
    icon: {
      type: String,
      value: '📭'
    },
    text: {
      type: String,
      value: '暂无内容'
    },
    hint: {
      type: String,
      value: ''
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
    onAction: function () {
      this.triggerEvent('action');
    }
  }
});
