#!/bin/bash

# Скрипт синхронизации кода с Replit
# Использование: ./sync-from-replit.sh

set -e

echo "🔄 Синхронизация с Replit..."

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# URL вашего Replit проекта (замените на свой)
REPLIT_USER=${REPLIT_USER:-"your-username"}
REPLIT_PROJECT=${REPLIT_PROJECT:-"vetsystem"}
REPLIT_GIT_URL="https://github.com/replit/${REPLIT_USER}-${REPLIT_PROJECT}.git"

echo -e "${YELLOW}📥 Скачиваем код с Replit...${NC}"

# Если .git не существует, инициализируем
if [ ! -d ".git" ]; then
    git init
    git remote add replit "$REPLIT_GIT_URL"
fi

# Убедимся что remote replit существует
git remote get-url replit &>/dev/null || git remote add replit "$REPLIT_GIT_URL"

# Получаем последние изменения
git fetch replit main
git pull replit main --allow-unrelated-histories

echo -e "${GREEN}✅ Синхронизация завершена${NC}"
echo ""
echo -e "${YELLOW}💡 Теперь выполните:${NC}"
echo -e "   sudo ./upgrade.sh    - для применения изменений"
echo ""
