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
fi

# Удаляем старый remote если существует и создаём новый с токеном
if git remote get-url replit &>/dev/null; then
    echo -e "${YELLOW}🔄 Обновляем remote URL с токеном...${NC}"
    git remote remove replit
fi

git remote add replit "$REPLIT_GIT_URL"

echo -e "${YELLOW}📡 Подключение к: ${REPLIT_USER}-${REPLIT_PROJECT}${NC}"

# Получаем последние изменения
git fetch replit main 2>&1 || {
    echo -e "${RED}❌ Ошибка при получении данных из репозитория${NC}"
    echo -e "${YELLOW}💡 Проверьте:${NC}"
    echo "   1. Правильность токена GitHub"
    echo "   2. Существование репозитория: https://github.com/replit/${REPLIT_USER}-${REPLIT_PROJECT}"
    echo "   3. Права токена (должен иметь 'repo' scope)"
    exit 1
}

git pull replit main --allow-unrelated-histories

echo -e "${GREEN}✅ Синхронизация завершена${NC}"
echo ""
echo -e "${YELLOW}💡 Теперь выполните:${NC}"
echo -e "   sudo ./upgrade.sh    - для применения изменений"
echo ""
