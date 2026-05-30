FROM node:20-alpine

WORKDIR /app

COPY server/package.json ./
RUN npm install --production

COPY server/src/ ./src/

RUN mkdir -p /data
ENV DB_PATH=/data/huashi.db
ENV SERVICE_BASE_URL=https://express-b0s9-261800-8-1436543849.sh.run.tcloudbase.com

EXPOSE 80

CMD ["node", "src/index.js"]
