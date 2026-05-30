Component({
  properties: {
    post: {
      type: Object,
      value: {}
    }
  },

  data: {
    images: [],
    circleTypeName: ''
  },

  observers: {
    'post': function (post) {
      if (!post) return;

      // Parse images JSON string into array
      let images = [];
      if (typeof post.images === 'string') {
        try {
          images = JSON.parse(post.images);
        } catch (e) {
          images = [];
        }
      } else if (Array.isArray(post.images)) {
        images = post.images;
      }

      // Resolve circle type display name
      var circleTypeName = '';
      if (post.circle_type) {
        var map = {
          general: '闲聊',
          help: '求助',
          treehole: '树洞',
          carpool: '拼车',
          lunch: '拼饭',
          other: '其他'
        };
        circleTypeName = map[post.circle_type] || post.circle_type;
      }

      this.setData({
        images: images,
        circleTypeName: circleTypeName
      });
    }
  },

  methods: {
    onTap: function () {
      this.triggerEvent('tap', { post: this.data.post });
    },

    onLike: function () {
      this.triggerEvent('like', { post: this.data.post });
    },

    onFavorite: function () {
      this.triggerEvent('favorite', { post: this.data.post });
    },

    onChat: function () {
      this.triggerEvent('chat', { userId: this.data.post.user_id });
    }
  }
});
