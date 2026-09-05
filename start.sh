#!/bin/sh
# Schulte Trainer —— Linux 启动脚本
# 用法: ./start.sh           默认端口 3000，监听 0.0.0.0
#       PORT=8080 ./start.sh 指定端口
#       NO_OPEN=1 ./start.sh 禁止自动打开浏览器（服务器上通常已跳过）
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js not found. Install Node.js >= 18 first."
  exit 1
fi

exec node server.js
