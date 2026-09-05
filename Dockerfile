# Schulte Trainer —— Docker 部署
# 构建：docker build -t schulte-trainer .
# 运行：docker run -d -p 3000:3000 --name schulte-trainer schulte-trainer
# 数据持久化：docker run -d -p 3000:3000 -v schulte-data:/app/data --name schulte-trainer schulte-trainer

FROM node:20-alpine
WORKDIR /app

COPY package.json server.js start.sh ./
COPY public ./public

# 运行时目录 data 由程序自动创建；确保可写
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
