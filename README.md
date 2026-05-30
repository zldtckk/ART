# 画室圈 🎨

杭州美术集训生社区。面向杭州高三美术生的轻量化社区平台。

## 功能

- **画室圈子** — 按画室分区的私密社区，闲聊、树洞、备考、习作、通知
- **二手集市** — 画材闲置流转（开发中）
- **追星专区** — 课余兴趣交流（开发中）

## 技术栈

- 前端：React + Vite
- 后端：Express + SQLite
- 风格：Apple 极简灰调

## 本地开发

```bash
# 安装依赖
cd server && npm install
cd ../client && npm install

# 初始化数据库
cd ../server && npm run seed

# 启动（前端 + 后端）
cd .. && npm run dev
```

前端 http://localhost:5173 | 后端 http://localhost:3000
