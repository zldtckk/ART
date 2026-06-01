function formatTime(val) {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(typeof val === 'object' && val.$date ? val.$date : val);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (d.toDateString() === now.toDateString()) {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  const diffDays = Math.floor(diff / 86400000);
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return diffDays + '天前';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const CIRCLE_TYPE_MAP = {
  general: '闲聊', help: '求助', treehole: '树洞',
  carpool: '拼车', lunch: '拼饭', other: '其他',
};

function getCircleTypeName(type) {
  return CIRCLE_TYPE_MAP[type] || '';
}

const FAN_TYPE_MAP = { share: '安利', findmate: '求同好', gossip: '八卦' };

function getFanTypeName(type) {
  return FAN_TYPE_MAP[type] || '';
}

module.exports = { formatTime, getCircleTypeName, getFanTypeName };
