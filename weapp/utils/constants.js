const BOARDS = [
  { key: 'circle', name: '画室圈', icon: '🎨' },
  { key: 'market', name: '二手集市', icon: '🏪' },
  { key: 'fan', name: '粉丝圈', icon: '⭐' },
];

const CIRCLE_TYPES = [
  { key: 'general', name: '闲聊' },
  { key: 'help', name: '求助' },
  { key: 'treehole', name: '树洞' },
  { key: 'carpool', name: '拼车' },
  { key: 'lunch', name: '拼饭' },
  { key: 'other', name: '其他' },
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
  FAN_TYPES,
  MARKET_CATEGORIES,
  MARKET_TAGS,
  PAGE_SIZE,
  SYSTEM_AVATARS,
  avatarPath,
  resolveImageUrl,
  resolvePostImages,
};
