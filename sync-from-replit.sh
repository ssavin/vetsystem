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

# Настройки репозитория
GITHUB_USER=${GITHUB_USER:-"ssavin"}
GITHUB_REPO=${GITHUB_REPO:-"vetsystem"}

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

REPLIT_GIT_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"

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

echo -e "${YELLOW}📡 Подключение к: ${GITHUB_USER}/${GITHUB_REPO}${NC}"

# Получаем последние изменения
git fetch replit main 2>&1 || {
    echo -e "${RED}❌ Ошибка при получении данных из репозитория${NC}"
    echo -e "${YELLOW}💡 Проверьте:${NC}"
    echo "   1. Правильность токена GitHub"
    echo "   2. Существование репозитория: https://github.com/${GITHUB_USER}/${GITHUB_REPO}"
    echo "   3. Права токена (должен иметь 'repo' scope)"
    exit 1
}

# Проверяем, есть ли неотслеживаемые файлы, которые могут конфликтовать
echo -e "${YELLOW}🔍 Проверяем конфликты...${NC}"

# Пробуем объединить изменения, сохраняя вывод
git pull replit main --allow-unrelated-histories > /tmp/git-pull-output.log 2>&1
PULL_EXIT_CODE=$?

if [ $PULL_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Синхронизация завершена${NC}"
else
    # Показываем вывод git
    cat /tmp/git-pull-output.log
    
    # Если произошла ошибка из-за неотслеживаемых файлов
    if grep -q "untracked working tree files would be overwritten" /tmp/git-pull-output.log; then
        echo ""
        echo -e "${YELLOW}⚠️  Обнаружены локальные файлы, которые конфликтуют с GitHub${NC}"
        echo -e "${YELLOW}💾 Сохраняем текущие файлы в backup...${NC}"
        
        # Создаём резервную копию
        BACKUP_DIR="/root/vetsystem-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Копируем важные файлы конфигурации (если есть)
        [ -f ".env" ] && cp .env "$BACKUP_DIR/" 2>/dev/null
        [ -f ".env.production" ] && cp .env.production "$BACKUP_DIR/" 2>/dev/null
        
        echo -e "${YELLOW}📁 Backup создан: ${BACKUP_DIR}${NC}"
        echo -e "${YELLOW}🔄 Принудительно применяем изменения из GitHub...${NC}"
        
        # Принудительно сбрасываем к состоянию из GitHub
        git reset --hard replit/main
        
        echo -e "${GREEN}✅ Синхронизация завершена (принудительно)${NC}"
        echo -e "${YELLOW}⚠️  Локальные изменения сохранены в: ${BACKUP_DIR}${NC}"
    else
        echo ""
        echo -e "${RED}❌ Произошла неизвестная ошибка при синхронизации${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}💡 Теперь выполните:${NC}"
echo -e "   sudo ./upgrade.sh    - для применения изменений"
echo ""
