# Развертывание VetSystem на vetsystemai.ru

## Предварительные требования

На сервере должны быть установлены:
- **Node.js** 18+ (рекомендуется 20+)
- **PostgreSQL** 14+
- **npm** (поставляется с Node.js)
- **nginx** (опционально, для reverse proxy)

## Пошаговая инструкция развертывания

### Шаг 1: Загрузка файлов на сервер

```bash
# С локальной машины загрузить на сервер
scp vetsystem_clean_20251019_115746.tar.gz user@vetsystemai.ru:/var/www/
scp backup_no_owner_20251019_165716.sql.gz user@vetsystemai.ru:/tmp/

# Подключиться к серверу
ssh user@vetsystemai.ru
```

### Шаг 2: Распаковка проекта

```bash
# Перейти в директорию
cd /var/www/

# Распаковать архив
tar -xzf vetsystem_clean_20251019_115746.tar.gz

# Переименовать папку (опционально)
mv vetsystem vetsystem-app
cd vetsystem-app
```

### Шаг 3: Установка зависимостей

```bash
# Установить все Node.js зависимости
npm install

# Это может занять несколько минут
# Будут установлены все пакеты из package.json
```

### Шаг 4: Настройка базы данных

```bash
# Создать базу данных
sudo -u postgres createdb vetsystem

# Восстановить backup
gunzip -c /tmp/backup_no_owner_20251019_165716.sql.gz | psql -U postgres -d vetsystem

# Проверить что данные восстановились
psql -U postgres -d vetsystem -c "SELECT count(*) FROM patients;"
```

### Шаг 5: Настройка переменных окружения

```bash
# Создать .env файл
nano .env
```

Добавьте следующее содержимое:

```env
# PostgreSQL
DATABASE_URL=postgresql://postgres:your_db_password@localhost:5432/vetsystem
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_db_password
PGDATABASE=vetsystem

# Session
SESSION_SECRET=generate_random_secret_key_here_min_32_chars

# Environment
NODE_ENV=production
PORT=5000

# Интеграции (опционально, настраивается через UI)
# OPENAI_API_KEY=your_key_if_needed
```

Генерация безопасного SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Шаг 6: Сборка проекта

```bash
# Собрать frontend и backend
npm run build

# Должны появиться файлы в папке dist/
ls -la dist/
```

### Шаг 7: Запуск приложения

#### Вариант А: Запуск напрямую (для тестирования)

```bash
# Запустить приложение
npm start

# Приложение будет доступно на http://localhost:5000
# Для остановки: Ctrl+C
```

#### Вариант Б: Запуск через PM2 (рекомендуется для production)

```bash
# Установить PM2 глобально
sudo npm install -g pm2

# Запустить приложение через PM2
pm2 start npm --name "vetsystem" -- start

# Настроить автозапуск при перезагрузке сервера
pm2 startup
pm2 save

# Полезные команды PM2:
pm2 status              # Статус приложения
pm2 logs vetsystem      # Просмотр логов
pm2 restart vetsystem   # Перезапуск
pm2 stop vetsystem      # Остановка
pm2 delete vetsystem    # Удалить из PM2
```

### Шаг 8: Настройка Nginx (reverse proxy)

```bash
# Создать конфигурацию Nginx
sudo nano /etc/nginx/sites-available/vetsystem
```

Добавьте:

```nginx
server {
    listen 80;
    server_name vetsystemai.ru www.vetsystemai.ru;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support для real-time features
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    client_max_body_size 100M;
}
```

Активировать конфигурацию:

```bash
# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/vetsystem /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

### Шаг 9: Настройка SSL (HTTPS)

```bash
# Установить Certbot
sudo apt-get install certbot python3-certbot-nginx

# Получить SSL сертификат
sudo certbot --nginx -d vetsystemai.ru -d www.vetsystemai.ru

# Автообновление сертификата настроится автоматически
```

### Шаг 10: Настройка Firewall

```bash
# Разрешить HTTP, HTTPS и SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Проверить статус
sudo ufw status
```

## Проверка развертывания

```bash
# Проверить что Node.js приложение запущено
pm2 status

# Проверить логи
pm2 logs vetsystem --lines 50

# Проверить что Nginx работает
sudo systemctl status nginx

# Проверить что PostgreSQL работает
sudo systemctl status postgresql

# Проверить доступность сайта
curl http://localhost:5000
curl https://vetsystemai.ru
```

## Обновление приложения

Когда нужно обновить код:

```bash
# 1. Загрузить новый архив
scp new_version.tar.gz user@vetsystemai.ru:/var/www/

# 2. Остановить приложение
pm2 stop vetsystem

# 3. Создать backup текущей версии
cd /var/www
tar -czf vetsystem-backup-$(date +%Y%m%d).tar.gz vetsystem-app/

# 4. Распаковать новую версию
tar -xzf new_version.tar.gz

# 5. Установить зависимости
cd vetsystem-app
npm install

# 6. Собрать проект
npm run build

# 7. Запустить приложение
pm2 restart vetsystem
```

## Мониторинг

```bash
# Логи приложения
pm2 logs vetsystem

# Использование ресурсов
pm2 monit

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

## Backup в production

```bash
# Создать скрипт автоматического backup
sudo nano /usr/local/bin/vetsystem-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/vetsystem"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup базы данных
pg_dump -U postgres vetsystem | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup uploaded files (если есть)
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /var/www/vetsystem-app/uploads/

# Удалить backup старше 30 дней
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Сделать скрипт исполняемым
sudo chmod +x /usr/local/bin/vetsystem-backup.sh

# Добавить в cron (ежедневно в 2:00)
sudo crontab -e
```

Добавить:
```
0 2 * * * /usr/local/bin/vetsystem-backup.sh >> /var/log/vetsystem-backup.log 2>&1
```

## Решение проблем

### Проблема: "npm run build" не находит vite

```bash
# Установить зависимости
npm install

# Если проблема сохраняется, очистить и переустановить
rm -rf node_modules package-lock.json
npm install
```

### Проблема: Приложение не запускается

```bash
# Проверить логи PM2
pm2 logs vetsystem

# Проверить переменные окружения
cat .env

# Проверить что порт 5000 свободен
sudo netstat -tlnp | grep 5000
```

### Проблема: База данных не подключается

```bash
# Проверить что PostgreSQL запущен
sudo systemctl status postgresql

# Проверить подключение
psql -U postgres -d vetsystem -c "SELECT 1;"

# Проверить DATABASE_URL в .env
```

### Проблема: 502 Bad Gateway от Nginx

```bash
# Проверить что приложение запущено
pm2 status

# Проверить логи Nginx
sudo tail -f /var/log/nginx/error.log

# Перезапустить приложение
pm2 restart vetsystem
```

## Безопасность

1. **Сменить пароли всех пользователей** после восстановления БД
2. **Настроить firewall** (UFW)
3. **Использовать HTTPS** (Let's Encrypt)
4. **Ограничить доступ к PostgreSQL** только с localhost
5. **Регулярно обновлять систему**: `sudo apt update && sudo apt upgrade`
6. **Настроить fail2ban** для защиты от брутфорса

## Контрольный список развертывания

- [ ] Node.js 18+ установлен
- [ ] PostgreSQL 14+ установлен
- [ ] Архив проекта распакован
- [ ] `npm install` выполнен
- [ ] База данных создана и восстановлена
- [ ] Файл `.env` настроен
- [ ] `npm run build` выполнен успешно
- [ ] Приложение запускается через PM2
- [ ] Nginx настроен как reverse proxy
- [ ] SSL сертификат установлен
- [ ] Firewall настроен
- [ ] Автоматический backup настроен
- [ ] Мониторинг настроен

---

**Дата создания:** 19 октября 2025  
**Сервер:** vetsystemai.ru  
**PostgreSQL:** 14  
**Node.js:** 18+
