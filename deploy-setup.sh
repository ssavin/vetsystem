#!/bin/bash

# Скрипт первоначальной настройки сервера для VetSystem
# Использование: sudo ./deploy-setup.sh

set -e

echo "🚀 Настройка сервера для VetSystem..."

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}❌ Пожалуйста, запустите скрипт с правами root${NC}"
   exit 1
fi

# Переменные
PROJECT_DIR="/var/www/vetsystem"
GIT_REPO_URL=${1:-""}  # URL репозитория передаётся как аргумент

if [ -z "$GIT_REPO_URL" ]; then
    echo -e "${RED}❌ Укажите URL Git репозитория${NC}"
    echo -e "${YELLOW}Использование: sudo ./deploy-setup.sh <git-repo-url>${NC}"
    echo -e "${YELLOW}Пример: sudo ./deploy-setup.sh https://github.com/your-org/vetsystem.git${NC}"
    exit 1
fi

# 1. Создаём директорию проекта
echo -e "${YELLOW}📁 Создаём директорию проекта...${NC}"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 2. Клонируем репозиторий
echo -e "${YELLOW}📥 Клонируем репозиторий...${NC}"
if [ -d ".git" ]; then
    echo -e "${YELLOW}Репозиторий уже существует, обновляем...${NC}"
    git fetch origin main
    git pull origin main
else
    git clone "$GIT_REPO_URL" .
fi

# 3. Устанавливаем Node.js зависимости
echo -e "${YELLOW}📦 Устанавливаем зависимости...${NC}"
npm install

# 4. Копируем пример .env файла
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️  Создаём .env файл...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${RED}⚠️  ВАЖНО: Отредактируйте файл .env с правильными настройками!${NC}"
    else
        cat > .env << EOF
# Database
DATABASE_URL=postgresql://vetsystem:password@localhost:5432/vetsystem

# Server
PORT=5000
NODE_ENV=production

# Sessions
SESSION_SECRET=$(openssl rand -hex 32)

# External integrations (опционально)
MOYSKLAD_API_TOKEN=
MOYSKLAD_LOGIN=
MOYSKLAD_PASSWORD=
MOYSKLAD_RETAIL_STORE_ID=

YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=

ONEC_BASE_URL=
ONEC_USERNAME=
ONEC_PASSWORD=
ONEC_ORGANIZATION_KEY=
ONEC_CASH_REGISTER_KEY=
EOF
        echo -e "${GREEN}✅ Создан файл .env${NC}"
        echo -e "${RED}⚠️  ВАЖНО: Отредактируйте файл .env с правильными настройками!${NC}"
    fi
fi

# 5. Собираем приложение
echo -e "${YELLOW}🔨 Собираем приложение...${NC}"
npm run build

# 6. Применяем миграции БД
echo -e "${YELLOW}🗄️  Применяем миграции БД...${NC}"
npm run db:push

# 7. Настраиваем PM2
echo -e "${YELLOW}⚙️  Настраиваем PM2...${NC}"
pm2 delete vetsystem 2>/dev/null || true
pm2 start npm --name "vetsystem" -- start
pm2 save
pm2 startup

# 8. Делаем upgrade.sh исполняемым
chmod +x upgrade.sh

echo ""
echo -e "${GREEN}✅ Настройка завершена!${NC}"
echo ""
echo -e "${YELLOW}📋 Следующие шаги:${NC}"
echo -e "1. Отредактируйте файл .env: nano $PROJECT_DIR/.env"
echo -e "2. Перезапустите приложение: pm2 restart vetsystem"
echo -e "3. Проверьте логи: pm2 logs vetsystem"
echo ""
echo -e "${YELLOW}💡 Для обновления в будущем используйте:${NC}"
echo -e "   sudo ./upgrade.sh"
echo ""
