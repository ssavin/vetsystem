#!/bin/bash

# Скрипт для развертывания VetSystem на Ubuntu сервере
# Использование: ./deploy.sh [server_ip] [server_user]

SERVER_IP=${1:-"your-server-ip"}
SERVER_USER=${2:-"ubuntu"}
APP_PATH="/var/www/vetsystem"

echo "🚀 Начало развертывания VetSystem на сервер $SERVER_IP"

# Создание архива приложения
echo "📦 Создание архива приложения..."
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='desktop_pos' \
    --exclude='*.log' \
    --exclude='.env*' \
    -czf vetsystem-deploy.tar.gz .

echo "✅ Архив создан: vetsystem-deploy.tar.gz"

# Загрузка на сервер
echo "⬆️ Загрузка файлов на сервер..."
scp vetsystem-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# Выполнение команд на сервере
echo "🔧 Выполнение установки на сервере..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'

# Создание директории приложения
sudo mkdir -p /var/www/vetsystem
sudo chown $USER:$USER /var/www/vetsystem

# Распаковка приложения
cd /var/www/vetsystem
tar -xzf /tmp/vetsystem-deploy.tar.gz

# Создание директории для логов PM2
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Установка зависимостей
echo "📚 Установка зависимостей..."
npm ci --only=production

# Создание .env файла из шаблона (нужно будет отредактировать)
if [ ! -f .env ]; then
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://vetsystem_user:your_password@localhost:5432/vetsystem_prod

# API ключи (заменить на реальные)
MOYSKLAD_API_TOKEN=your_moysklad_token
MOYSKLAD_LOGIN=your_moysklad_login
MOYSKLAD_PASSWORD=your_moysklad_password
MOYSKLAD_RETAIL_STORE_ID=your_store_id

YOOKASSA_SECRET_KEY=your_yookassa_secret
YOOKASSA_SHOP_ID=your_shop_id

OPENAI_API_KEY=your_openai_key
EOF
    echo "⚠️ Создан файл .env - необходимо отредактировать с реальными данными!"
fi

ENDSSH

echo "✅ Основные файлы загружены. Необходимо:"
echo "1. Отредактировать .env файл с реальными данными"
echo "2. Настроить базу данных PostgreSQL"
echo "3. Запустить приложение через PM2"
echo "4. Настроить Nginx"

# Удаление временного архива
rm vetsystem-deploy.tar.gz

echo "📖 Используйте deployment-guide.md для завершения настройки"