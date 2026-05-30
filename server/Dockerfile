FROM node:20-alpine

WORKDIR /app

# 安装 CA 证书（微信 API HTTPS 需要）
RUN apk add --no-cache ca-certificates

# 先复制依赖文件，利用 Docker 缓存
COPY package.json ./
RUN npm install --production

# 复制源码
COPY src/ ./src/

# 数据库持久化目录（云托管卷挂载点）
RUN mkdir -p /data
ENV DB_PATH=/data/huashi.db

EXPOSE 80

CMD ["node", "src/index.js"]
