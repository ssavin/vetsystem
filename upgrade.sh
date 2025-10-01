#!/bin/bash

# Скрипт автоматического обновления VetSystem на сервере
# Использование: ./upgrade.sh

set -e  # Остановить выполнение при ошибке

echo "🚀 Начинаем обновление VetSystem..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}❌ Пожалуйста, запустите скрипт с правами root (sudo ./upgrade.sh)${NC}"
   exit 1
fi

# Определяем директорию проекта
PROJECT_DIR="/var/www/vetsystem"
BACKUP_DIR="/var/backups/vetsystem"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${YELLOW}📁 Рабочая директория: $PROJECT_DIR${NC}"

# Создаём директорию для бэкапов если её нет
mkdir -p "$BACKUP_DIR"

# Переходим в директорию проекта
cd "$PROJECT_DIR" || exit 1

# 1. Создаём бэкап текущей версии
echo -e "${YELLOW}💾 Создаём бэкап текущей версии...${NC}"
tar -czf "$BACKUP_DIR/vetsystem_backup_$TIMESTAMP.tar.gz" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    . 2>/dev/null || true

# 2. Скачиваем последние изменения из Git репозитория
echo -e "${YELLOW}📥 Загружаем последние изменения...${NC}"
if [ -d ".git" ]; then
    # Определяем какой remote использовать (replit или origin)
    REMOTE_NAME="replit"
    if ! git remote get-url "$REMOTE_NAME" &>/dev/null; then
        REMOTE_NAME="origin"
        if ! git remote get-url "$REMOTE_NAME" &>/dev/null; then
            echo -e "${RED}❌ Git remote не найден.${NC}"
            echo -e "${YELLOW}💡 Сначала выполните: sudo ./sync-from-replit.sh${NC}"
            exit 1
        fi
    fi
    
    echo -e "${YELLOW}📡 Используем remote: ${REMOTE_NAME}${NC}"
    
    # Сохраняем локальные изменения (если есть)
    git stash save "Auto-stash before upgrade $TIMESTAMP" 2>/dev/null || true
    
    # Получаем последние изменения
    git fetch "$REMOTE_NAME" main
    git reset --hard "$REMOTE_NAME/main"
    
    echo -e "${GREEN}✅ Код обновлён${NC}"
else
    echo -e "${RED}❌ Git репозиторий не найден.${NC}"
    echo -e "${YELLOW}💡 Сначала выполните: sudo ./sync-from-replit.sh${NC}"
    exit 1
fi

# 3. Устанавливаем/обновляем зависимости
echo -e "${YELLOW}📦 Обновляем зависимости Node.js...${NC}"
npm install --production

# 4. Собираем фронтенд
echo -e "${YELLOW}🔨 Собираем фронтенд...${NC}"
npm run build

# 5. Применяем миграции базы данных
echo -e "${YELLOW}🗄️  Применяем миграции БД...${NC}"
npm run db:push

# 6. Перезапускаем PM2 процессы
echo -e "${YELLOW}🔄 Перезапускаем приложение...${NC}"
pm2 restart vetsystem || pm2 start npm --name "vetsystem" -- start

# 7. Проверяем статус
echo -e "${YELLOW}📊 Проверяем статус приложения...${NC}"
sleep 3
pm2 status vetsystem

# 8. Показываем логи для проверки
echo -e "${YELLOW}📋 Последние логи:${NC}"
pm2 logs vetsystem --lines 20 --nostream

echo ""
echo -e "${GREEN}✅ Обновление завершено успешно!${NC}"
echo -e "${GREEN}📦 Бэкап сохранён: $BACKUP_DIR/vetsystem_backup_$TIMESTAMP.tar.gz${NC}"
echo ""
echo -e "${YELLOW}💡 Полезные команды:${NC}"
echo -e "   pm2 logs vetsystem       - Просмотр логов"
echo -e "   pm2 status               - Статус процессов"
echo -e "   pm2 restart vetsystem    - Перезапуск приложения"
echo ""
