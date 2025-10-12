# 🚀 Quick Start - Развертывание VetSystem на vetsysai.ru

Это краткое руководство для быстрого развертывания. Полная документация в [DEPLOYMENT.md](DEPLOYMENT.md).

---

## ⚡ Быстрая установка (для опытных администраторов)

### 1. Подготовка сервера (5 минут)

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PostgreSQL, Nginx, PM2
sudo apt install -y postgresql nginx
sudo npm install -g pm2

# Создание пользователя
sudo adduser --disabled-password --gecos "" vetsystem
```

### 2. Настройка базы данных (3 минуты)

```bash
sudo -u postgres psql <<EOF
CREATE USER vetsystem_user WITH PASSWORD 'надежный_пароль';
CREATE DATABASE vetsystem_prod OWNER vetsystem_user;
\c vetsystem_prod
GRANT ALL ON SCHEMA public TO vetsystem_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vetsystem_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vetsystem_user;
\q
EOF
```

### 3. Развертывание приложения (10 минут)

```bash
# Переключитесь на пользователя vetsystem
sudo su - vetsystem

# Создайте директорию и перейдите в нее
mkdir -p ~/apps && cd ~/apps

# Скопируйте файлы проекта (используйте scp/rsync)
# Например: scp -r vetsystem/ vetsystem@vetsysai.ru:~/apps/

# Или клонируйте из Git
# git clone https://github.com/your-repo/vetsystem.git
cd vetsystem

# Установите зависимости
npm install

# Создайте .env.production (скопируйте из примера и заполните)
cp .env.production.example .env.production
nano .env.production  # Заполните все необходимые переменные

# Соберите frontend
npm run build

# Примените миграции
export NODE_ENV=production
npm run db:push

# Создайте директории
mkdir -p logs uploads
chmod 755 uploads
```

### 4. Запуск через PM2 (2 минуты)

```bash
# Запустите приложение
pm2 start ecosystem.config.js

# Сохраните конфигурацию
pm2 save

# Настройте автозапуск
pm2 startup systemd -u vetsystem --hp /home/vetsystem
# Выполните команду, которую выведет PM2

# Проверьте статус
pm2 status
pm2 logs vetsystem --lines 50
```

### 5. Настройка Nginx (5 минут)

Создайте конфигурацию `/etc/nginx/sites-available/vetsysai.ru`:

```nginx
server {
    listen 80;
    server_name vetsysai.ru www.vetsysai.ru;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/vetsysai.ru /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL сертификат (3 минуты)

```bash
# Установите Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получите сертификат
sudo certbot --nginx -d vetsysai.ru -d www.vetsysai.ru
```

### 7. Firewall (2 минуты)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## ✅ Проверка установки

```bash
# Проверьте приложение
curl http://localhost:5000

# Проверьте через Nginx
curl https://vetsysai.ru

# Просмотрите логи
pm2 logs vetsystem

# Проверьте статус
pm2 status
```

---

## 🔄 Обновление приложения

### Вариант 1: Через готовый скрипт

```bash
cd ~/apps/vetsystem
./deploy.sh
```

### Вариант 2: Вручную

```bash
cd ~/apps/vetsystem
git pull origin main
npm install
npm run build
export NODE_ENV=production
npm run db:push
pm2 restart vetsystem
```

---

## 📋 Checklist перед запуском

- [ ] Node.js 20.x установлен (`node -v`)
- [ ] PostgreSQL работает (`systemctl status postgresql`)
- [ ] База данных создана и миграции применены
- [ ] `.env.production` файл создан и заполнен
- [ ] JWT_SECRET и SESSION_SECRET сгенерированы
- [ ] Frontend собран (`npm run build` выполнен успешно)
- [ ] PM2 запущен (`pm2 status` показывает "online")
- [ ] Nginx работает и настроен
- [ ] SSL сертификат получен
- [ ] Firewall настроен
- [ ] DNS записи для vetsysai.ru направлены на сервер
- [ ] Приложение доступно по https://vetsysai.ru
- [ ] Логи не показывают критических ошибок

---

## 🔑 Обязательные environment variables

Минимальный набор для запуска:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://vetsystem_user:password@localhost:5432/vetsystem_prod
JWT_SECRET=ваш_64_символьный_секрет
SESSION_SECRET=ваш_64_символьный_секрет
```

Для работы всех функций также нужны:
- `TWILIO_*` - для SMS
- `YOOKASSA_*` - для платежей  
- `MOYSKLAD_*` - для складского учета
- `OPENAI_API_KEY` - для AI функций

---

## 📞 Нужна помощь?

- **Приложение не запускается**: `pm2 logs vetsystem --lines 100`
- **Nginx 502 Error**: Проверьте что приложение запущено `pm2 status`
- **База данных недоступна**: `systemctl status postgresql`

Полная документация: [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Время установки:** ~30 минут  
**Последнее обновление:** 12 октября 2025
