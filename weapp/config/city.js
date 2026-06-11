// 城市配置 —— 切换城市只需改这里
const CITIES = [
  {
    slug: 'hangzhou',
    name: '杭州',
    shareTitle: '画室圈 - 杭州美术集训生社区',
    appDesc: '杭州美术集训生社区',
  },
  {
    slug: 'guangzhou',
    name: '广州',
    shareTitle: '画室圈 - 广州美术生社区',
    appDesc: '广州美术生社区',
  },
];

// 各城市画室数据
const STUDIOS = {
  hangzhou: [
    { name: '老鹰画室', district: '西湖区' },
    { name: '白墙画室', district: '滨江区' },
    { name: '孪生画室', district: '西湖区' },
    { name: '将军画室', district: '余杭区' },
    { name: '厚一学堂', district: '富阳区' },
    { name: '大象画室', district: '萧山区' },
    { name: '正向画室', district: '西湖区' },
    { name: '东昱画室', district: '滨江区' },
  ],
  guangzhou: [
    { name: '一尚画室', district: '海珠区' },
    { name: '新奇点画室', district: '增城区' },
    { name: '树华画室', district: '海珠区' },
    { name: '点绘画室', district: '南沙区' },
    { name: '同盟画室', district: '南沙区' },
    { name: '度岸画室', district: '海珠区' },
    { name: '江山艺术画室', district: '南沙区' },
    { name: '占晟画室', district: '南沙区' },
    { name: '姜浩张超画室', district: '佛山市' },
    { name: '天行健画室', district: '南沙区' },
    { name: '人艺画室', district: '海珠区' },
    { name: '创艺画室', district: '黄埔区' },
    { name: '更高画室', district: '海珠区' },
    { name: '寒阳画室', district: '海珠区' },
    { name: '正美术画室', district: '增城区' },
    { name: '艺巢画室', district: '增城区' },
    { name: '飞天画室', district: '黄埔区' },
    { name: '人人画室', district: '黄埔区' },
    { name: '达芬奇画室', district: '南沙区' },
    { name: '新锐画室', district: '增城区' },
    { name: '超艺画室', district: '南沙区' },
    { name: '战国画室', district: '南沙区' },
    { name: '清华园画室', district: '番禺区' },
    { name: '上善画室', district: '佛山市' },
    { name: '立青画室', district: '深圳市' },
  ],
};

// 默认城市 slug（用户首次进入未选择时使用）
const DEFAULT_CITY = 'hangzhou';

module.exports = { CITIES, STUDIOS, DEFAULT_CITY };
