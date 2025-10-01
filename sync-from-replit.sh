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
REPLIT_USER=${REPLIT_USER:-"ssavinmailbox"}
REPLIT_PROJECT=${REPLIT_PROJECT:-"vetsystem"}

# GitHub Personal Access Token (создайте на https://github.com/settings/tokens)
# Можно передать через переменную окружения: export GITHUB_TOKEN="ghp_your_token"
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}❌ Ошибка: GITHUB_TOKEN не установлен${NC}"
    echo -e "${YELLOW}💡 Создайте Personal Access Token:${NC}"
    echo "   1. Перейдите на https://github.com/settings/tokens"
    echo "   2. Создайте новый токен с правами 'repo'"
    echo "   3. Установите переменную: export GITHUB_TOKEN=\"ваш_токен\""
    echo ""
    echo -e "${YELLOW}Или используйте:${NC}"
    echo "   GITHUB_TOKEN=\"ваш_токен\" sudo -E ./sync-from-replit.sh"
    exit 1
fi

REPLIT_GIT_URL="https://${GITHUB_TOKEN}@github.com/replit/${REPLIT_USER}-${REPLIT_PROJECT}.git"

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
