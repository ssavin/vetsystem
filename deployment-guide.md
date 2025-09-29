# Руководство по развертыванию VetSystem на Ubuntu

## 1. Подготовка файлов

### Создать архив проекта:
```bash
# Исключить ненужные файлы
tar --exclude='node_modules' --exclude='.git' --exclude='desktop_pos' -czf vetsystem.tar.gz .
```

### Переменные окружения для production:
```bash
# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://ваш_пользователь:пароль@localhost:5432/vetsystem_prod
MOYSKLAD_API_TOKEN=ваш_токен
YOOKASSA_SECRET_KEY=ваш_ключ
YOOKASSA_SHOP_ID=ваш_id
OPENAI_API_KEY=ваш_ключ
```

## 2. Настройка Ubuntu сервера

### Обновление системы:
```bash
sudo apt update && sudo apt upgrade -y
```

### Установка Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
```

### Установка PostgreSQL:
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Установка PM2:
```bash
sudo npm install -g pm2
```

### Установка Nginx:
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

## 3. Настройка базы данных

### Создание пользователя и базы:
```bash
sudo -u postgres psql
CREATE DATABASE vetsystem_prod;
CREATE USER vetsystem_user WITH ENCRYPTED PASSWORD 'ваш_пароль';
GRANT ALL PRIVILEGES ON DATABASE vetsystem_prod TO vetsystem_user;
\q
```

## 4. Развертывание приложения

### Загрузка и распаковка:
```bash
cd /var/www
sudo mkdir vetsystem
sudo chown $USER:$USER vetsystem
cd vetsystem
# Загрузить vetsystem.tar.gz через scp или другим способом
tar -xzf vetsystem.tar.gz
```

### Установка зависимостей:
```bash
npm ci --only=production
```

### Настройка переменных окружения:
```bash
cp .env.production .env
# Отредактировать .env с реальными данными
```

### Запуск миграций базы данных:
```bash
npm run db:push
```

## 5. Настройка PM2

### Создать ecosystem.config.js:
```javascript
module.exports = {
  apps: [{
    name: 'vetsystem-production',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx/esm',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### Запуск приложения:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 6. Настройка Nginx

### Создать конфигурацию сайта:
```bash
sudo nano /etc/nginx/sites-available/vetsystemai.ru
```

### Конфигурация Nginx:
```nginx
upstream vetsystem_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name vetsystemai.ru www.vetsystemai.ru;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    location / {
        proxy_pass http://vetsystem_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }

    # Static files
    location /assets/ {
        alias /var/www/vetsystem/client/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Активация сайта:
```bash
sudo ln -s /etc/nginx/sites-available/vetsystemai.ru /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # удалить default если есть
sudo nginx -t
sudo systemctl restart nginx
```

## 7. Настройка SSL (Let's Encrypt)

### Установка Certbot:
```bash
sudo apt install snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### Получение сертификата:
```bash
sudo certbot --nginx -d vetsystemai.ru -d www.vetsystemai.ru
```

## 8. Проверка развертывания

### Проверить статус:
```bash
pm2 list
pm2 logs vetsystem-production
sudo systemctl status nginx
```

### Тестирование:
```bash
curl -I https://vetsystemai.ru
```

## 9. Обновление приложения

### Скрипт для обновления:
```bash
#!/bin/bash
# update-app.sh

cd /var/www/vetsystem

# Резервное копирование
cp .env .env.backup

# Получение обновлений
git pull origin main  # или загрузка нового архива

# Обновление зависимостей
npm ci --only=production

# Обновление базы данных
npm run db:push

# Перезапуск приложения
pm2 reload ecosystem.config.js --env production

echo "Приложение обновлено успешно!"
```

## 10. Мониторинг и логи

### Просмотр логов:
```bash
pm2 logs vetsystem-production
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Мониторинг ресурсов:
```bash
pm2 monit
```