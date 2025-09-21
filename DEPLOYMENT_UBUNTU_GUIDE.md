# 🚀 VetSystem - Развертывание на Ubuntu Сервере

## 📦 ПОДГОТОВКА АРХИВА

Архив `vetsystem-deployment.tar.gz` (68MB) создан с Replit и содержит:
- ✅ Собранные CSS файлы с правильными стилями (77.15 kB)
- ✅ Все исходники и конфигурации
- ✅ Готовые production файлы в папке `dist/`
- ✅ Настроенный Tailwind с safelist

## 🖥️ РАЗВЕРТЫВАНИЕ НА UBUNTU

### 1. **Установка зависимостей на сервере:**
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Установка Nginx
sudo apt install nginx -y

# Установка PM2 для управления процессами
sudo npm install -g pm2
```

### 2. **Настройка базы данных:**
```bash
# Переключение на пользователя postgres
sudo -u postgres psql

# В PostgreSQL консоли:
CREATE DATABASE vetsystem;
CREATE USER vetsystem WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE vetsystem TO vetsystem;

# Подключение к базе и включение расширения
\c vetsystem
CREATE EXTENSION IF NOT EXISTS pgcrypto;
\q
```

### 3. **Развертывание приложения:**
```bash
# Создание директории
sudo mkdir -p /var/www/vetsystem
cd /var/www/vetsystem

# Копирование и распаковка архива
sudo tar -xzf /path/to/vetsystem-deployment.tar.gz -C .
sudo chown -R $USER:$USER /var/www/vetsystem

# Установка зависимостей (включая dev для настройки БД)
npm ci

# Создание папки для uploads
mkdir -p uploads/patient-files
chmod 755 uploads/
```

### 4. **Переменные окружения:**
```bash
# Создание .env файла
sudo nano /var/www/vetsystem/.env
```

**Содержимое .env:**
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgres://vetsystem:your_secure_password@localhost:5432/vetsystem
SESSION_SECRET=your_super_secure_session_secret_here
OPENAI_API_KEY=your_openai_key_if_needed
```

### 5. **Настройка базы данных:**
```bash
# ВАРИАНТ А: Использование готового дампа (РЕКОМЕНДУЕТСЯ)
psql -U vetsystem -d vetsystem -f vetsystem_complete_dump.sql

# ВАРИАНТ Б: Применение схемы через Drizzle (если нет дампа)
npm run db:push

# После настройки БД - удаляем dev зависимости для production
npm ci --only=production
```

### 6. **Настройка PM2:**
```bash
# Создание ecosystem файла
nano ecosystem.config.js
```

**Содержимое ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'vetsystem',
    script: 'dist/index.js',
    cwd: '/var/www/vetsystem',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/vetsystem/error.log',
    out_file: '/var/log/vetsystem/out.log',
    log_file: '/var/log/vetsystem/combined.log'
  }]
};
```

```bash
# Создание директории для логов
sudo mkdir -p /var/log/vetsystem
sudo chown $USER:$USER /var/log/vetsystem

# Запуск приложения
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. **Настройка Nginx:**
```bash
sudo nano /etc/nginx/sites-available/vetsystem
```

**Содержимое Nginx конфигурации:**
```nginx
server {
    listen 80;
    server_name ВАШИ_ДОМЕНЫ_ЗДЕСЬ;  # Замените на ваш реальный домен

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ВАШИ_ДОМЕНЫ_ЗДЕСЬ;  # Замените на ваш реальный домен

    # SSL настройки (добавить после получения сертификатов)
    ssl_certificate /etc/ssl/certs/vetsystemai.ru.crt;
    ssl_certificate_key /etc/ssl/private/vetsystemai.ru.key;
    
    # Основные настройки
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активация сайта
sudo ln -s /etc/nginx/sites-available/vetsystem /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. **SSL сертификат (Let's Encrypt):**
```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение сертификата (замените домены на ваши)
sudo certbot --nginx -d ВАШ_ДОМЕН -d www.ВАШ_ДОМЕН

# Автоматическое обновление
sudo systemctl enable certbot.timer
```

## ✅ **ПРОВЕРКА РАЗВЕРТЫВАНИЯ:**

```bash
# Проверка статуса приложения
pm2 status
pm2 logs vetsystem

# Проверка портов
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Проверка Nginx
sudo systemctl status nginx

# Проверка CSS в браузере (замените домен)
curl -I https://ВАШ_ДОМЕН/assets/index-*.css
```

## 🎯 **ВАЖНЫЕ МОМЕНТЫ:**

1. **CSS файл должен быть 77+ kB** - это показатель что стили включены
2. **Обязательно использовать dist/ папку** - там готовые файлы
3. **Переменные окружения критичны** - особенно NODE_ENV=production
4. **Права доступа** - uploads папка должна быть доступна для записи
5. **Сессии в PostgreSQL** - проверить что работают

## 🚨 **ЧАСТЫЕ ОШИБКИ:**

- ❌ Копирование только исходников без dist/
- ❌ Отсутствие NODE_ENV=production
- ❌ Неправильная DATABASE_URL
- ❌ Отсутствие pgcrypto расширения
- ❌ Запуск через `npm run dev` вместо production
- ❌ **НЕ ПЕРЕСОБИРАЙТЕ CSS НА СЕРВЕРЕ!** Используйте готовый dist/ из архива
- ❌ Использование --only=production перед настройкой БД

## 📞 **ДИАГНОСТИКА ПРОБЛЕМ:**

```bash
# Логи приложения
pm2 logs vetsystem --lines 100

# Логи Nginx
sudo tail -f /var/log/nginx/error.log

# Проверка CSS размера
ls -lh /var/www/vetsystem/dist/public/assets/*.css

# Тест подключения к БД
psql $DATABASE_URL -c "SELECT version();"
```

---

**После развертывания система должна работать так же как на Replit!** 🎯