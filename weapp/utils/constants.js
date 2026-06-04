const BOARDS = [
  { key: 'circle', name: '画室圈', icon: '🎨' },
  { key: 'market', name: '二手集市', icon: '🏪' },
  { key: 'fan', name: '粉丝圈', icon: '⭐' },
];

const CIRCLE_TYPES = [
  { key: 'general', name: '闲聊', hint: '随便聊，什么都行' },
  { key: 'artwork', name: '作品', hint: '自己的习作、老师范画都能晒' },
  { key: 'help', name: '求助', hint: '有问题？问大家' },
  { key: 'food', name: '觅食', hint: '发现好吃的，快来安利' },
  { key: 'fun', name: '放风', hint: '发现好玩的，快来安利' },
  { key: 'pinduo', name: '拼单', hint: '拼车 / 拼饭都在这里' },
];

const GATHERING_TYPES = [
  { key: 'food', name: '约饭 🍜', desc: '火锅、烤肉、奶茶、探店...' },
  { key: 'play', name: '约玩 🎮', desc: '密室逃脱、网吧开黑、KTV、桌游...' },
  { key: 'walk', name: '约逛 🛍', desc: '漫展、商场、步行街、景点...' },
  { key: 'photo', name: '约拍 📷', desc: '街拍、公园、复古风、氛围感...' },
  { key: 'other', name: '其他 ✨', desc: '说说你想约什么' },
];

const MARKET_CATEGORIES = [
  { key: 'art_supplies', name: '画材' },
  { key: 'textbooks', name: '教材' },
  { key: 'life', name: '生活' },
  { key: 'digital', name: '数码' },
  { key: 'other', name: '其他' },
];

const FAN_TYPES = [
  { key: 'share', name: '安利' },
  { key: 'findmate', name: '求同好' },
  { key: 'activity', name: '活动' },
  { key: 'gossip', name: '八卦' },
];

const MARKET_TAGS = [
  { key: 'sell', name: '出售' },
  { key: 'buy', name: '求购' },
  { key: 'free', name: '赠送' },
];

const PAGE_SIZE = 20;

// 系统像素头像（12 生肖），PNG 打包在 /assets/avatars/
const SYSTEM_AVATARS = [
  { key: 'rat', name: '鼠' }, { key: 'ox', name: '牛' },
  { key: 'tiger', name: '虎' }, { key: 'rabbit', name: '兔' },
  { key: 'dragon', name: '龙' }, { key: 'snake', name: '蛇' },
  { key: 'horse', name: '马' }, { key: 'goat', name: '羊' },
  { key: 'monkey', name: '猴' }, { key: 'rooster', name: '鸡' },
  { key: 'dog', name: '狗' }, { key: 'pig', name: '猪' },
];

function avatarPath(key) {
  return key ? `/assets/avatars/${key}.png` : '';
}

function resolveImageUrl(url) {
  if (!url) return '';
  return url;
}

function resolvePostImages(post) {
  if (!post || !post._parsedImages) return post;
  return {
    ...post,
    _parsedImages: post._parsedImages.slice(0, 3).map(resolveImageUrl),
    display_avatar: resolveImageUrl(post.display_avatar || post.avatar_url),
  };
}

module.exports = {
  BOARDS,
  CIRCLE_TYPES,
  GATHERING_TYPES,
  FAN_TYPES,
  MARKET_CATEGORIES,
  MARKET_TAGS,
  PAGE_SIZE,
  SYSTEM_AVATARS,
  avatarPath,
  resolveImageUrl,
  resolvePostImages,
};
