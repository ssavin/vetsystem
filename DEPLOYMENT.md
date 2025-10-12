# 🚀 Deployment Guide для VetSystem на vetsystemai.ru

**Дата обновления:** 12 октября 2025  
**Версия приложения:** 2.0 (с мобильным приложением)

---

## 📋 Содержание

1. [Системные требования](#системные-требования)
2. [Подготовка сервера](#подготовка-сервера)
3. [Настройка базы данных](#настройка-базы-данных)
4. [Развертывание приложения](#развертывание-приложения)
5. [Настройка Nginx](#настройка-nginx)
6. [SSL сертификаты](#ssl-сертификаты)
7. [PM2 Process Manager](#pm2-process-manager)
8. [Обновление приложения](#обновление-приложения)
9. [Мониторинг и логи](#мониторинг-и-логи)
10. [Резервное копирование](#резервное-копирование)
11. [Troubleshooting](#troubleshooting)

---

## 🖥️ Системные требования

- **OS**: Ubuntu 20.04 LTS или новее
- **Node.js**: 20.x LTS
- **PostgreSQL**: 14 или новее
- **Nginx**: последняя стабильная версия
- **RAM**: минимум 4GB (рекомендуется 8GB+)
- **Disk**: минимум 50GB свободного места
- **CPU**: 2+ ядра

---

## 🔧 Подготовка сервера

### Шаг 1: Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential
```

### Шаг 2: Установка Node.js 20.x

```bash
# Добавление репозитория NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Установка Node.js
sudo apt install -y nodejs

# Проверка версий
node --version   # Должно быть v20.x.x
npm --version    # Должно быть 10.x.x
```

### Шаг 3: Установка PostgreSQL 14

```bash
# Добавление репозитория PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Установка PostgreSQL
sudo apt update
sudo apt install -y postgresql-14 postgresql-contrib-14

# Запуск и автозапуск
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Шаг 4: Установка Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Шаг 5: Установка PM2

```bash
sudo npm install -g pm2
```

### Шаг 6: Создание пользователя для приложения

```bash
sudo adduser --disabled-password --gecos "" vetsystem
sudo usermod -aG sudo vetsystem
```

---

## 🗄️ Настройка базы данных

### Создание базы данных и пользователя

```bash
sudo -u postgres psql <<EOF
-- Создание пользователя
CREATE USER vetsystem_user WITH PASSWORD 'ваш_надежный_пароль_минимум_32_символа';

-- Создание базы данных
CREATE DATABASE vetsystem_prod OWNER vetsystem_user;

-- Подключение к базе
\c vetsystem_prod

-- Права на схему public
GRANT ALL ON SCHEMA public TO vetsystem_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vetsystem_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vetsystem_user;

-- Настройка прав по умолчанию для будущих объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vetsystem_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vetsystem_user;

\q
EOF
```

### Настройка PostgreSQL для производительности

Отредактируйте `/etc/postgresql/14/main/postgresql.conf`:

```ini
# Память
shared_buffers = 1GB                    # 25% от RAM
effective_cache_size = 3GB              # 75% от RAM
work_mem = 16MB
maintenance_work_mem = 256MB

# Контрольные точки
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 2GB
min_wal_size = 512MB

# Логирование медленных запросов
log_min_duration_statement = 1000       # Логировать запросы > 1 секунды
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Подключения
max_connections = 100
```

Перезапустите PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## 📦 Развертывание приложения

### Шаг 1: Клонирование репозитория

```bash
# Переключитесь на пользователя vetsystem
sudo su - vetsystem

# Создайте директорию для приложений
mkdir -p ~/apps
cd ~/apps

# Клонируйте проект (через Git или прямой перенос)
# Вариант A: Через Git
git clone https://github.com/your-username/vetsystem.git
cd vetsystem

# Вариант B: Прямой перенос с Replit (см. ниже)
```

### Шаг 1B: Прямой перенос с Replit

На вашем **локальном компьютере** или в **Replit Shell**:

```bash
# Если используете Replit Shell
zip -r vetsystem-$(date +%Y%m%d).zip . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "mobile-app/node_modules/*" \
  -x "dist/*" \
  -x "uploads/*"

# Скачайте архив и загрузите на сервер через scp
# На локальном компьютере:
scp vetsystem-*.zip vetsystem@vetsystemai.ru:~/apps/
```

На **сервере**:

```bash
cd ~/apps
unzip vetsystem-*.zip -d vetsystem
cd vetsystem
```

### Шаг 2: Установка зависимостей

```bash
# Установите ВСЕ зависимости (включая devDependencies для сборки frontend)
npm install
```

### Шаг 3: Создание .env файла

Создайте файл `~/apps/vetsystem/.env.production`:

```bash
nano ~/apps/vetsystem/.env.production
```

Содержимое файла:

```env
# ===== ОСНОВНЫЕ НАСТРОЙКИ =====
NODE_ENV=production
PORT=5000

# ===== БАЗА ДАННЫХ =====
DATABASE_URL=postgresql://vetsystem_user:ваш_пароль@localhost:5432/vetsystem_prod

# ===== БЕЗОПАСНОСТЬ =====
# Сгенерируйте надежные секреты: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=ваш_jwt_secret_64_символа_минимум
SESSION_SECRET=ваш_session_secret_64_символа_минимум

# ===== TWILIO (SMS) =====
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+79XXXXXXXXX

# ===== YOOKASSA (ПЛАТЕЖИ) =====
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key

# ===== MOYSKLAD =====
MOYSKLAD_LOGIN=your_login
MOYSKLAD_PASSWORD=your_password
MOYSKLAD_API_TOKEN=your_api_token
MOYSKLAD_RETAIL_STORE_ID=your_store_id

# ===== DADATA =====
DADATA_API_KEY=your_dadata_api_key

# ===== OPENAI =====
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===== VETAIS (для миграции данных - опционально) =====
VETAIS_DB_HOST=your_vetais_host
VETAIS_DB_PORT=3306
VETAIS_DB_NAME=your_vetais_db
VETAIS_DB_USER=your_vetais_user
VETAIS_DB_PASSWORD=your_vetais_password

# ===== ДОМЕН =====
VITE_API_URL=https://vetsystemai.ru
```

**Важно**: Защитите файл от чтения другими пользователями:
```bash
chmod 600 ~/apps/vetsystem/.env.production
```

### Шаг 4: Сборка frontend

```bash
cd ~/apps/vetsystem
npm run build
```

### Шаг 5: Применение миграций базы данных

```bash
# Убедитесь что .env.production используется
export NODE_ENV=production

# Примените миграции
npm run db:push

# Если есть предупреждения о потере данных:
npm run db:push -- --force
```

### Шаг 6: Создание директорий для uploads и логов

```bash
mkdir -p ~/apps/vetsystem/uploads
mkdir -p ~/apps/vetsystem/logs
chmod 755 ~/apps/vetsystem/uploads
```

---

## 🌐 Настройка Nginx

### Создание конфигурации

```bash
sudo nano /etc/nginx/sites-available/vetsystemai.ru
```

Содержимое файла:

```nginx
# ===== HTTP -> HTTPS редирект =====
server {
    listen 80;
    listen [::]:80;
    server_name vetsystemai.ru www.vetsystemai.ru;
    
    # Разрешить Let's Encrypt вчаlidation
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Редирект всего остального на HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# ===== HTTPS =====
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name vetsystemai.ru www.vetsystemai.ru;

    # ===== SSL сертификаты =====
    ssl_certificate /etc/letsencrypt/live/vetsystemai.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vetsystemai.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # ===== Безопасность =====
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # ===== Логи =====
    access_log /var/log/nginx/vetsysai_access.log;
    error_log /var/log/nginx/vetsysai_error.log;

    # ===== Размер загружаемых файлов =====
    client_max_body_size 100M;
    client_body_buffer_size 128k;

    # ===== Прокси к Node.js приложению =====
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Заголовки
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        send_timeout 300s;
    }

    # ===== Статические файлы uploads =====
    location /uploads {
        alias /home/vetsystem/apps/vetsystem/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ===== Gzip compression =====
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
```

### Активация конфигурации

```bash
# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/vetsystemai.ru /etc/nginx/sites-enabled/

# Удалите конфигурацию по умолчанию
sudo rm -f /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t

# Пока НЕ перезапускайте Nginx (сначала нужен SSL сертификат)
```

---

## 🔒 SSL сертификаты

### Установка Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Получение SSL сертификата

**ВАЖНО**: Перед этим убедитесь что:
- DNS записи A для vetsystemai.ru и www.vetsystemai.ru направлены на IP вашего сервера
- Порты 80 и 443 открыты в firewall

```bash
# Получите сертификат
sudo certbot --nginx -d vetsystemai.ru -d www.vetsystemai.ru --email your@email.com --agree-tos --no-eff-email

# Certbot автоматически настроит Nginx
```

### Автообновление сертификатов

```bash
# Проверьте таймер автообновления
sudo systemctl status certbot.timer

# Тест обновления
sudo certbot renew --dry-run

# Сертификаты будут автоматически обновляться каждые 60 дней
```

### Перезапуск Nginx

```bash
sudo systemctl reload nginx
```

---

## ⚙️ PM2 Process Manager

### Создание ecosystem файла

```bash
nano ~/apps/vetsystem/ecosystem.config.js
```

Содержимое:

```javascript
module.exports = {
  apps: [{
    name: 'vetsystem',
    script: './server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    env_file: '.env.production',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
  }]
};
```

### Запуск приложения

```bash
cd ~/apps/vetsystem

# Запустите приложение
pm2 start ecosystem.config.js

# Сохраните конфигурацию PM2
pm2 save

# Настройте автозапуск при перезагрузке
pm2 startup systemd -u vetsystem --hp /home/vetsystem
# Выполните команду, которую выведет PM2
```

### Полезные команды PM2

```bash
# Статус приложений
pm2 status

# Логи в реальном времени
pm2 logs vetsystem

# Логи последних 100 строк
pm2 logs vetsystem --lines 100

# Перезапуск
pm2 restart vetsystem

# Остановка
pm2 stop vetsystem

# Мониторинг
pm2 monit

# Информация о процессе
pm2 show vetsystem
```

---

## 🔄 Обновление приложения

### Создание скрипта для обновления

```bash
nano ~/apps/vetsystem/deploy.sh
```

Содержимое:

```bash
#!/bin/bash

set -e  # Выход при ошибке

echo "🚀 Starting deployment..."

# Переход в директорию проекта
cd /home/vetsystem/apps/vetsystem

# Резервное копирование
echo "📦 Creating backup..."
BACKUP_DIR="/home/vetsystem/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf "$BACKUP_DIR/vetsystem_$TIMESTAMP.tar.gz" \
  --exclude='node_modules' \
  --exclude='mobile-app/node_modules' \
  --exclude='dist' \
  --exclude='logs' \
  --exclude='.git' \
  .

# Сохранение состояния PM2
pm2 save

# Получение последних изменений
echo "📥 Pulling latest changes..."
git pull origin main

# Установка зависимостей (включая devDependencies для сборки)
echo "📦 Installing dependencies..."
npm install

# Сборка frontend
echo "🔨 Building frontend..."
npm run build

# Применение миграций БД
echo "🗄️  Running database migrations..."
export NODE_ENV=production
npm run db:push

# Перезапуск приложения
echo "🔄 Restarting application..."
pm2 restart vetsystem

# Проверка статуса
echo "✅ Deployment complete!"
pm2 status
echo ""
echo "📊 Latest logs:"
pm2 logs vetsystem --lines 50 --nostream

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "vetsystem_*.tar.gz" -mtime +30 -delete
```

Сделайте скрипт исполняемым:
```bash
chmod +x ~/apps/vetsystem/deploy.sh
```

### Использование скрипта обновления

```bash
cd ~/apps/vetsystem
./deploy.sh
```

---

## 📊 Мониторинг и логи

### Логи приложения

```bash
# PM2 логи в реальном времени
pm2 logs vetsystem

# Логи последних 200 строк
pm2 logs vetsystem --lines 200

# Только ошибки
pm2 logs vetsystem --err

# Файлы логов напрямую
tail -f ~/apps/vetsystem/logs/pm2-error.log
tail -f ~/apps/vetsystem/logs/pm2-out.log
```

### Логи Nginx

```bash
# Access логи
sudo tail -f /var/log/nginx/vetsysai_access.log

# Error логи
sudo tail -f /var/log/nginx/vetsysai_error.log
```

### Логи PostgreSQL

```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Мониторинг ресурсов

```bash
# PM2 мониторинг
pm2 monit

# Системные ресурсы
htop

# Использование диска
df -h

# Использование памяти
free -h
```

---

## 💾 Резервное копирование

### Скрипт резервного копирования БД

```bash
nano ~/backup-db.sh
```

Содержимое:

```bash
#!/bin/bash

# Настройки
BACKUP_DIR="/home/vetsystem/backups/db"
DB_NAME="vetsystem_prod"
DB_USER="vetsystem_user"
DB_PASSWORD="ваш_пароль"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/vetsystem_db_$DATE.sql.gz"

# Создание директории
mkdir -p $BACKUP_DIR

# Создание бэкапа
PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Проверка размера
SIZE=$(du -h $BACKUP_FILE | cut -f1)
echo "Backup created: $BACKUP_FILE ($SIZE)"

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "vetsystem_db_*.sql.gz" -mtime +30 -delete

# Загрузка в облако (опционально)
# rclone copy $BACKUP_FILE remote:backups/vetsystem/
```

Сделайте исполняемым:
```bash
chmod +x ~/backup-db.sh
```

### Автоматическое резервное копирование

```bash
# Добавьте в crontab
crontab -e

# Добавьте строки:
# Резервное копирование БД каждый день в 3:00
0 3 * * * /home/vetsystem/backup-db.sh >> /home/vetsystem/backups/backup.log 2>&1

# Резервное копирование файлов каждую неделю в воскресенье 4:00
0 4 * * 0 tar -czf /home/vetsystem/backups/uploads_$(date +\%Y\%m\%d).tar.gz /home/vetsystem/apps/vetsystem/uploads
```

### Восстановление из бэкапа

```bash
# База данных
gunzip < /home/vetsystem/backups/db/vetsystem_db_YYYYMMDD_HHMMSS.sql.gz | \
  PGPASSWORD=ваш_пароль psql -h localhost -U vetsystem_user -d vetsystem_prod

# Файлы приложения
pm2 stop vetsystem
cd /home/vetsystem/apps
tar -xzf /home/vetsystem/backups/vetsystem_YYYYMMDD_HHMMSS.tar.gz
pm2 restart vetsystem
```

---

## 🔥 Firewall

```bash
# Установка UFW
sudo apt install -y ufw

# Базовые правила
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Разрешить SSH
sudo ufw allow 22/tcp

# Разрешить HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включить firewall
sudo ufw enable

# Проверить статус
sudo ufw status verbose
```

---

## ⚠️ Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи PM2
pm2 logs vetsystem --lines 200

# Проверьте environment variables
pm2 env vetsystem

# Проверьте порт
sudo netstat -tlnp | grep 5000

# Попробуйте запустить напрямую
cd ~/apps/vetsystem
NODE_ENV=production node --loader tsx server/index.ts
```

### Nginx показывает 502 Bad Gateway

```bash
# Убедитесь что приложение запущено
pm2 status

# Проверьте логи Nginx
sudo tail -f /var/log/nginx/vetsysai_error.log

# Проверьте подключение к приложению
curl http://localhost:5000

# Перезапустите приложение
pm2 restart vetsystem
```

### База данных недоступна

```bash
# Проверьте статус PostgreSQL
sudo systemctl status postgresql

# Проверьте подключение
PGPASSWORD=ваш_пароль psql -h localhost -U vetsystem_user -d vetsystem_prod -c "SELECT version();"

# Проверьте логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Перезапустите PostgreSQL
sudo systemctl restart postgresql
```

### Медленные запросы

```bash
# Проверьте логи приложения на медленные запросы
pm2 logs vetsystem | grep "Slow query"

# Проверьте PostgreSQL логи
sudo tail -f /var/log/postgresql/postgresql-14-main.log | grep "duration:"

# Создайте индексы для медленных запросов
# (см. документацию по оптимизации БД)
```

### Нехватка места на диске

```bash
# Проверьте использование диска
df -h

# Найдите большие файлы
du -h ~/ | sort -rh | head -20

# Очистите старые логи
pm2 flush
sudo find /var/log -name "*.log" -mtime +30 -delete

# Очистите старые бэкапы
find ~/backups -mtime +30 -delete
```

---

## ✅ Checklist перед запуском

- [ ] Сервер обновлен (apt update && upgrade)
- [ ] Node.js 20.x установлен
- [ ] PostgreSQL 14+ установлен и настроен
- [ ] База данных создана, миграции применены
- [ ] .env.production файл создан и настроен
- [ ] Все секреты (JWT_SECRET, SESSION_SECRET) сгенерированы
- [ ] Frontend собран (npm run build)
- [ ] Nginx установлен и настроен
- [ ] SSL сертификаты получены и установлены
- [ ] PM2 запущен, приложение работает
- [ ] Автозапуск PM2 настроен (pm2 startup)
- [ ] Firewall настроен (UFW)
- [ ] DNS записи для vetsystemai.ru настроены
- [ ] Резервное копирование настроено (cron)
- [ ] Логи приложения проверены (нет критических ошибок)
- [ ] Приложение доступно по https://vetsystemai.ru
- [ ] API ключи (Twilio, YooKassa) актуальны и работают
- [ ] Тестирование основных функций выполнено

---

## 📱 Мобильное приложение (опционально)

Мобильное приложение находится в папке `mobile-app/`. Для его развертывания:

1. Установите Expo CLI на вашем компьютере: `npm install -g expo-cli`
2. Обновите `mobile-app/src/services/api.ts` - измените baseURL на `https://vetsystemai.ru`
3. Соберите приложение через Expo EAS Build
4. Опубликуйте в App Store / Google Play

Подробнее см. документацию Expo: https://docs.expo.dev/

---

## 📞 Поддержка

При возникновении проблем проверьте:
1. Логи PM2: `pm2 logs vetsystem`
2. Логи Nginx: `/var/log/nginx/vetsysai_error.log`
3. Логи PostgreSQL: `/var/log/postgresql/`
4. Статус сервисов: `pm2 status`, `systemctl status nginx`, `systemctl status postgresql`

---

**Последнее обновление:** 12 октября 2025
