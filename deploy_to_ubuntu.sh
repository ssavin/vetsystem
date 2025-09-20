#!/bin/bash

# 🚀 Скрипт автоматического переноса VetSystem на Ubuntu 20 сервер
# Использование: ./deploy_to_ubuntu.sh your-domain.com

set -e  # Остановка при ошибке

DOMAIN=${1:-"localhost"}
VETSYSTEM_DIR="/var/www/vetsystem"

echo "🚀 Начинаем перенос VetSystem на Ubuntu сервер..."
echo "📋 Домен: $DOMAIN"

# Проверка прав sudo
if ! sudo -n true 2>/dev/null; then
    echo "❌ Требуются права sudo для установки"
    exit 1
fi

echo "📦 Шаг 1: Установка зависимостей..."

# Node.js 20
if ! command -v node &> /dev/null; then
    echo "🔄 Установка Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "🔄 Установка PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    echo "🔄 Установка Nginx..."
    sudo apt install -y nginx
fi

# Другие пакеты
sudo apt install -y git curl build-essential

echo "✅ Зависимости установлены!"

echo "📁 Шаг 2: Создание директорий..."
sudo mkdir -p $VETSYSTEM_DIR
sudo mkdir -p $VETSYSTEM_DIR/uploads/patient-files
sudo chown -R $USER:$USER $VETSYSTEM_DIR

echo "💾 Шаг 3: Настройка базы данных..."

# Запуск PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создание пользователя и базы данных
DB_PASSWORD=$(openssl rand -base64 12)
SESSION_SECRET=$(openssl rand -base64 32)

sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS vetsystem;
DROP USER IF EXISTS vetuser;
CREATE USER vetuser WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE vetsystem OWNER vetuser;
GRANT ALL PRIVILEGES ON DATABASE vetsystem TO vetuser;
\q
EOF

# Создание расширения pgcrypto для UUID функций
sudo -u postgres psql -d vetsystem -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

echo "✅ База данных настроена!"
echo "🔑 Пароль БД: $DB_PASSWORD"

echo "📋 Шаг 4: Создание .env файла..."
cat > $VETSYSTEM_DIR/.env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://vetuser:$DB_PASSWORD@localhost:5432/vetsystem
SESSION_SECRET=$SESSION_SECRET
OPENAI_API_KEY=your_openai_key_here
EOF

echo "✅ .env файл создан!"

echo "🔧 Шаг 5: Настройка systemd сервиса..."
sudo tee /etc/systemd/system/vetsystem.service > /dev/null << EOF
[Unit]
Description=VetSystem Application
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$VETSYSTEM_DIR
EnvironmentFile=$VETSYSTEM_DIR/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "🌐 Шаг 6: Настройка Nginx..."
sudo tee /etc/nginx/sites-available/vetsystem > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Корневая папка для Vite сборки
    root $VETSYSTEM_DIR/dist;
    index index.html;
    
    # Статические файлы (CSS, JS)
    location /assets/ {
        root $VETSYSTEM_DIR/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }
    
    # Загруженные файлы пациентов
    location /uploads/ {
        alias $VETSYSTEM_DIR/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # API запросы
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
    
    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    client_max_body_size 50M;
}
EOF

# Активация Nginx конфигурации
sudo ln -sf /etc/nginx/sites-available/vetsystem /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

echo "🔥 Шаг 7: Настройка файрвола..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
echo 'y' | sudo ufw enable

echo "⚡ Шаг 8: Инструкции для завершения..."
cat << EOF

🎉 Скрипт установки завершен!

📋 СЛЕДУЮЩИЕ ШАГИ (выполните вручную):

1️⃣ Скопируйте код из Replit в $VETSYSTEM_DIR:
   # Способ А (Рекомендуется): В Replit правый клик на проект → Download ZIP:
   cd /var/www/
   unzip имя_вашего_проекта.zip -d vetsystem
   
   # Способ Б: Или клонируйте Git (если доступен SSH):
   # git clone git@ВАШ_REPL_ID.ssh.replit.com:/home/runner/vetsystem vetsystem
   
2️⃣ Установите зависимости и соберите:
   npm ci --legacy-peer-deps
   npm run build

3️⃣ Импортируйте базу данных:
   psql "postgresql://vetuser:$DB_PASSWORD@localhost:5432/vetsystem" < $VETSYSTEM_DIR/vetsystem_dump.sql

4️⃣ Добавьте OPENAI_API_KEY в .env:
   nano $VETSYSTEM_DIR/.env

5️⃣ Установите права и запустите:
   sudo chown -R www-data:www-data $VETSYSTEM_DIR
   sudo chmod -R 775 $VETSYSTEM_DIR/uploads
   sudo systemctl daemon-reload
   sudo systemctl enable vetsystem
   sudo systemctl start vetsystem

6️⃣ Проверьте и перезапустите Nginx:
   sudo nginx -t
   sudo systemctl reload nginx

7️⃣ Для SSL (опционально):
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

📊 ПРОВЕРКА СТАТУСА:
   sudo systemctl status vetsystem
   sudo systemctl status nginx
   curl http://localhost:5000

🌐 После выполнения сайт будет доступен: http://$DOMAIN

🔑 ДАННЫЕ БАЗЫ:
   Пользователь: vetuser
   Пароль: $DB_PASSWORD
   База: vetsystem

EOF

echo "✅ Автоматическая установка завершена!"