# 🚀 Гид по переносу VetSystem с Replit на Ubuntu 20 сервер

## 📋 Что будет перенесено:
- ✅ Полный код приложения (React + Express + TypeScript)
- ✅ База данных PostgreSQL со всеми данными (20 таблиц)
- ✅ Конфигурация окружения
- ✅ Systemd сервисы для автозапуска
- ✅ Nginx веб-сервер с SSL

## 🛠 Технические требования Ubuntu сервера:
- Ubuntu 20.04 LTS или новее
- 2+ GB RAM
- 10+ GB свободного места
- Доступ по SSH с правами sudo

## 📦 Файлы для переноса:
1. **`vetsystem_dump.sql`** - полный дамп базы данных (69KB)
2. **Исходный код** - весь репозиторий (клонирование с Git)
3. **Environment файл** - переменные окружения

---

## 🚀 Пошаговая инструкция по переносу:

### Шаг 1: Подготовка Ubuntu сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии (должно быть 20+)
node --version
npm --version

# Установка PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Установка Nginx
sudo apt install nginx -y

# Установка дополнительных пакетов
sudo apt install git curl build-essential -y

# Создание папки для приложения и uploads
sudo mkdir -p /var/www/vetsystem
sudo mkdir -p /var/www/vetsystem/uploads/patient-files
sudo chown -R $USER:$USER /var/www/vetsystem
```

### Шаг 2: Перенос кода из Replit

**Способ 1: Через ZIP архив (рекомендуется) ⭐**
```bash
# 1. В Replit: правый клик на корневую папку проекта → Download
# 2. Загрузить ZIP файл на Ubuntu сервер
# 3. Распаковать:
cd /var/www/
unzip имя_вашего_проекта.zip -d vetsystem
cd vetsystem

# Установка зависимостей
npm ci

# Проверка структуры
ls -la
```

**Способ 2: Через Git SSH (если доступен)**
```bash
cd /var/www/
# В Replit найдите кнопку + → SSH для получения Git URL
# Формат: git@ВАШ_REPL_ID.ssh.replit.com:/home/runner/vetsystem
git clone git@ВАШ_REPL_ID.ssh.replit.com:/home/runner/vetsystem vetsystem
cd vetsystem
npm ci
```

### Шаг 3: Настройка базы данных PostgreSQL

```bash
# Вход в PostgreSQL
sudo -u postgres psql

# Создание пользователя и базы данных
CREATE USER vetuser WITH PASSWORD 'ваш_пароль_здесь';
CREATE DATABASE vetsystem OWNER vetuser;
GRANT ALL PRIVILEGES ON DATABASE vetsystem TO vetuser;
\q

# Создание необходимых расширений PostgreSQL
sudo -u postgres psql -d vetsystem -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Импорт данных из дампа (используем абсолютный путь)
psql -h localhost -U vetuser -d vetsystem < /var/www/vetsystem/vetsystem_dump.sql

# Проверка импорта
psql -h localhost -U vetuser -d vetsystem -c "\dt"
```

### Шаг 4: Настройка переменных окружения

```bash
# Создание .env файла
nano /var/www/vetsystem/.env
```

**Содержимое .env файла:**
```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://vetuser:ваш_пароль_здесь@localhost:5432/vetsystem
SESSION_SECRET=ваш_секретный_ключ_сессий
OPENAI_API_KEY=ваш_openai_api_key
```

**Генерация SESSION_SECRET:**
```bash
openssl rand -base64 32
```

### Шаг 5: Сборка приложения

```bash
cd /var/www/vetsystem

# Сборка приложения
npm run build

# Проверка что dist создан
ls -la dist/
ls -la dist/assets/
```

### Шаг 6: Настройка systemd сервиса

```bash
# Создание systemd сервиса
sudo nano /etc/systemd/system/vetsystem.service
```

**Содержимое сервиса:**
```ini
[Unit]
Description=VetSystem Application
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/vetsystem
EnvironmentFile=/var/www/vetsystem/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Установка прав
sudo chown -R www-data:www-data /var/www/vetsystem
sudo chmod -R 755 /var/www/vetsystem
# Специальные права для папки uploads
sudo chmod -R 775 /var/www/vetsystem/uploads

# Запуск сервиса
sudo systemctl daemon-reload
sudo systemctl enable vetsystem
sudo systemctl start vetsystem

# Проверка статуса
sudo systemctl status vetsystem
```

### Шаг 7: Настройка Nginx

```bash
# Создание конфигурации Nginx
sudo nano /etc/nginx/sites-available/vetsystem
```

**Конфигурация Nginx:**
```nginx
server {
    listen 80;
    server_name ваш-домен.com www.ваш-домен.com;
    
    # Корневая папка для Vite сборки
    root /var/www/vetsystem/dist;
    index index.html;
    
    # Статические файлы (CSS, JS) - Vite создает assets в dist/assets
    location /assets/ {
        root /var/www/vetsystem/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # Загруженные файлы пациентов
    location /uploads/ {
        alias /var/www/vetsystem/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # API запросы к приложению
    location /api/ {
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
    
    # WebSocket соединения
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    client_max_body_size 50M;
}
```

```bash
# Активация конфигурации
sudo ln -s /etc/nginx/sites-available/vetsystem /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Удаление дефолтной конфигурации

# Проверка и перезапуск
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 8: Настройка файрвола

```bash
# Настройка UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Проверка статуса
sudo ufw status
```

### Шаг 9: Настройка SSL (HTTPS)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение SSL сертификата
sudo certbot --nginx -d ваш-домен.com -d www.ваш-домен.com

# Автообновление сертификатов
sudo crontab -e
# Добавить строку:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## ✅ Проверка работы системы:

```bash
# Статус всех сервисов
sudo systemctl status vetsystem
sudo systemctl status nginx
sudo systemctl status postgresql

# Проверка портов
sudo netstat -tlnp | grep 5000  # Приложение
sudo netstat -tlnp | grep :80   # HTTP
sudo netstat -tlnp | grep :443  # HTTPS

# Тест подключения к базе
psql "postgresql://vetuser:пароль@localhost:5432/vetsystem" -c "SELECT current_database();"

# Логи приложения
sudo journalctl -u vetsystem -f

# Логи Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 🎯 Ожидаемый результат:

После выполнения всех шагов:
- ✅ **Сайт доступен** по адресу https://ваш-домен.com
- ✅ **Все функции работают**: регистратура, медкарты, финансы, AI-ассистент
- ✅ **База данных** полностью перенесена
- ✅ **Автозапуск** при перезагрузке сервера
- ✅ **SSL сертификаты** установлены

## 🆘 Устранение проблем:

**Если приложение не запускается:**
```bash
sudo journalctl -u vetsystem --no-pager -n 50
```

**Если база данных не подключается:**
```bash
sudo systemctl status postgresql
psql "postgresql://vetuser:пароль@localhost:5432/vetsystem" -c "SELECT 1;"
```

**Если Nginx возвращает ошибки:**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

---

## 📧 Поддержка:
После переноса все функции ветеринарной системы VetSystem будут полностью доступны на вашем Ubuntu сервере!